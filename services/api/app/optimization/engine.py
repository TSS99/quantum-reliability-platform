"""The two-stage optimizer + preflight (RECON-19/20/21).

Stage A is a HARD-CONSTRAINT PRE-FILTER: a candidate that violates a hard cap is marked infeasible
with a reason code BEFORE any scoring, so no weight can ever rescue a violated constraint. Stage B
scores only feasible candidates with a weighted sum over FIXED normalization ranges (never per-batch
min-max), and emits a per-term breakdown so 'why A beat B' is answerable by inspection.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.domain.reason_codes import Finding, PreflightStatus, status_from
from app.schemas.goal import ReliabilityGoal, ScoreWeights
from app.schemas.plan import ScoreBreakdown, ScoreTerm
from app.optimization.weights import weights_for

NORMALIZATION_REF = "docs/API_CONTRACT.md#normalization"
# Fixed documented upper bounds for normalising a raw metric to [0, 1] (0 = best, 1 = worst).
# Cost and time additionally never exceed the goal's own hard cap (that is the feasibility gate).
ERROR_NORM_MAX = 0.5  # absolute error on a normalized observable in [-1, 1]
EPS = 1e-9


@dataclass
class Candidate:
    """A pre-costed strategy×backend option handed to the optimizer."""

    candidate_id: str
    backend_id: str
    strategy_id: str
    estimated_cost_usd: float
    rmse: float
    estimated_qpu_seconds: float
    qubit_overhead: float = 0.0  # QEC only
    decoder_latency_s: float = 0.0  # QEC only


@dataclass
class Scored:
    candidate: Candidate
    feasibility: str  # "feasible" | "infeasible"
    findings: list[Finding]
    score: ScoreBreakdown | None
    tie_break_applied: bool = False


@dataclass
class OptimizeResult:
    ranked: list[Scored]
    recommended_id: str | None
    weights: ScoreWeights
    preflight_status: PreflightStatus
    preflight_summary: str
    explanation: str = ""
    infeasible: list[Scored] = field(default_factory=list)


def _q(value: float) -> float:
    return value


def stage_a_findings(c: Candidate, goal: ReliabilityGoal) -> list[Finding]:
    """Hard-constraint pre-filter → findings. Blocking findings make the candidate infeasible."""
    out: list[Finding] = []
    if c.estimated_cost_usd > goal.max_cost_usd.value + EPS:
        out.append(Finding(code="COST_EXCEEDED", severity="blocking", subject="plan", subject_id=c.candidate_id,
                           message=f"estimated cost ${c.estimated_cost_usd:.2f} exceeds the ${goal.max_cost_usd.value:.2f} budget",
                           evidence={"estimated_cost_usd": c.estimated_cost_usd, "max_cost_usd": goal.max_cost_usd.value}))
    if c.estimated_qpu_seconds > goal.max_runtime_seconds.value + EPS:
        out.append(Finding(code="MITIGATION_OVERHEAD_TOO_HIGH", severity="blocking", subject="plan", subject_id=c.candidate_id,
                           message=f"estimated runtime {c.estimated_qpu_seconds:.0f}s exceeds the {goal.max_runtime_seconds.value:.0f}s budget",
                           evidence={"estimated_qpu_seconds": c.estimated_qpu_seconds, "max_runtime_seconds": goal.max_runtime_seconds.value}))
    if c.rmse > goal.target_error.value + EPS:
        # Soft: not meeting the target is a warning, not a hard block (you may still want the best available).
        out.append(Finding(code="TARGET_ERROR_UNLIKELY", severity="warning", subject="plan", subject_id=c.candidate_id,
                           message=f"expected error {c.rmse:.3g} is above the target {goal.target_error.value:.3g}",
                           evidence={"rmse": c.rmse, "target_error": goal.target_error.value}))
    return out


def score(c: Candidate, goal: ReliabilityGoal, w: ScoreWeights) -> ScoreBreakdown:
    """Weighted sum over FIXED ranges. Each term normalised to [0,1] where 0 is best; the plan's
    total is 1 - Σ(weight·normalized) so higher total = better."""
    cost_max = max(goal.max_cost_usd.value, EPS)
    time_max = max(goal.max_runtime_seconds.value, EPS)
    terms_raw = [
        ("error", c.rmse, min(c.rmse / ERROR_NORM_MAX, 1.0), w.w_error),
        ("cost", c.estimated_cost_usd, min(c.estimated_cost_usd / cost_max, 1.0), w.w_cost),
        ("time", c.estimated_qpu_seconds, min(c.estimated_qpu_seconds / time_max, 1.0), w.w_time),
        ("qubit_overhead", c.qubit_overhead, min(c.qubit_overhead, 1.0), w.w_qubit_overhead),
        ("decoder_latency", c.decoder_latency_s, min(c.decoder_latency_s, 1.0), w.w_decoder_latency),
    ]
    terms = [ScoreTerm(key=k, raw_value=raw, normalized_value=norm, weight=wt, contribution=norm * wt)
             for (k, raw, norm, wt) in terms_raw]
    total = 1.0 - sum(t.contribution for t in terms)
    return ScoreBreakdown(total=total, terms=terms, weights=w, normalization_ref=NORMALIZATION_REF, tie_break_applied=False)


def optimize(candidates: list[Candidate], goal: ReliabilityGoal) -> OptimizeResult:
    w = weights_for(goal)
    scored: list[Scored] = []
    for c in candidates:
        findings = stage_a_findings(c, goal)
        infeasible = any(f.severity == "blocking" for f in findings)
        if infeasible:
            scored.append(Scored(candidate=c, feasibility="infeasible", findings=findings, score=None))
        else:
            scored.append(Scored(candidate=c, feasibility="feasible", findings=findings, score=score(c, goal, w)))

    feasible = [s for s in scored if s.feasibility == "feasible" and s.score is not None]
    # Rank by score desc, deterministic tie-break: lower cost wins.
    feasible.sort(key=lambda s: (-(s.score.total), s.candidate.estimated_cost_usd))  # type: ignore[union-attr]
    best = feasible[0] if feasible else None
    if best and len(feasible) > 1 and abs(best.score.total - feasible[1].score.total) < EPS:  # type: ignore[union-attr]
        best.tie_break_applied = True
        if best.score:
            best.score = best.score.model_copy(update={"tie_break_applied": True})

    recommended_id = best.candidate.candidate_id if best else None
    # Preflight is computed on the RECOMMENDED plan's findings (never hand-set).
    rec_findings = best.findings if best else [
        Finding(code="TARGET_ERROR_UNLIKELY", severity="blocking", subject="goal", subject_id=None,
                message="no candidate satisfies the hard constraints", evidence={})
    ]
    status = status_from(rec_findings)
    summary = _summary(status, best, goal)
    explanation = _explain(best, w) if best else "No feasible strategy under the current constraints."

    return OptimizeResult(ranked=feasible, recommended_id=recommended_id, weights=w,
                          preflight_status=status, preflight_summary=summary, explanation=explanation,
                          infeasible=[s for s in scored if s.feasibility == "infeasible"])


def _summary(status: PreflightStatus, best: Scored | None, goal: ReliabilityGoal) -> str:
    if status == "DO_NOT_RUN" or best is None:
        return "No strategy meets the constraints — relax the target error or raise the budget."
    if status == "RUN_WITH_WARNING":
        return f"{best.candidate.strategy_id} is the best option but does not reach the target error."
    return f"{best.candidate.strategy_id} on {best.candidate.backend_id} is recommended."


def _explain(best: Scored, w: ScoreWeights) -> str:
    if not best.score:
        return ""
    parts = [f"{t.key} {t.contribution:+.3f}" for t in best.score.terms if t.weight > 0]
    return f"score {best.score.total:.3f} = 1 - (" + " + ".join(parts) + ")"
