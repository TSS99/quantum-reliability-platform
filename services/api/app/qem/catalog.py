"""The strategy catalog — which candidates exist, and which of them may be offered.

The candidate list and its generation order come from `strategies.items` in the matrix (RECON-20:
fixed order so tie-breaks are deterministic). A candidate is offered only when every technique in
it, and its combination entry, evaluates to compatible or to a conditional.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.qem.matrix import Evaluation, Verdict, combination, evaluate, load_matrix


@dataclass(frozen=True)
class Strategy:
    id: str
    label: str
    techniques: tuple[str, ...]
    modifiers: tuple[str, ...]
    executable: bool
    recommendable: bool
    provenance: str


@dataclass(frozen=True)
class Candidate:
    strategy: Strategy
    verdict: Verdict
    evaluations: tuple[Evaluation, ...]
    applied_modifiers: tuple[str, ...]

    @property
    def offered(self) -> bool:
        return self.verdict != "incompatible"

    @property
    def requires(self) -> tuple[str, ...]:
        return tuple(e.requires for e in self.evaluations if e.requires)

    @property
    def blockers(self) -> tuple[Evaluation, ...]:
        return tuple(e for e in self.evaluations if e.verdict == "incompatible")


def strategies(matrix: dict[str, Any] | None = None) -> list[Strategy]:
    items = (matrix or load_matrix())["strategies"]["items"]
    return [
        Strategy(
            id=item["id"],
            label=item["label"],
            techniques=tuple(item["techniques"]),
            modifiers=tuple(item["modifiers"]),
            executable=item.get("executable", True),
            recommendable=item.get("recommendable", True),
            provenance=item.get("provenance", "heuristic"),
        )
        for item in items
    ]


def evaluate_strategy(
    strategy: Strategy, context: dict[str, Any], matrix: dict[str, Any] | None = None
) -> Candidate:
    """Evaluate one strategy. Modifiers are optional: an incompatible modifier is dropped, not fatal."""
    request = dict(context)
    request["request.executable"] = strategy.executable
    request["request.standalone"] = False

    evaluations = [evaluate(tid, request, matrix) for tid in strategy.techniques]
    combined = combination(strategy.techniques, matrix) if len(strategy.techniques) > 1 else None
    if combined is not None:
        evaluations.append(combined)

    applied = []
    for mid in strategy.modifiers:
        result = evaluate(mid, request, matrix)
        if result.verdict != "incompatible":
            applied.append(mid)
            evaluations.append(result)

    verdicts = {e.verdict for e in evaluations}
    if "incompatible" in verdicts:
        verdict: Verdict = "incompatible"
    elif "conditional" in verdicts:
        verdict = "conditional"
    else:
        verdict = "compatible"
    return Candidate(strategy, verdict, tuple(evaluations), tuple(applied))


def evaluate_all(
    context: dict[str, Any], matrix: dict[str, Any] | None = None
) -> list[Candidate]:
    """Every catalog strategy with its verdict, in generation order — offered and rejected alike."""
    return [evaluate_strategy(s, context, matrix) for s in strategies(matrix)]


def generate(context: dict[str, Any], matrix: dict[str, Any] | None = None) -> list[Candidate]:
    """The candidate set for MISSION section 18 step 5: only the strategies that may be offered.

    An incompatible technique never reaches this list, and therefore can never be recommended
    (RECON-19). `raw` has no techniques, so it is always here (invariant 7).
    """
    return [c for c in evaluate_all(context, matrix) if c.offered]


def recommendable(candidates: list[Candidate]) -> list[Candidate]:
    """Offered AND allowed to be the recommendation — `pec_estimate` is offered but never this."""
    return [c for c in candidates if c.strategy.recommendable and c.strategy.executable]
