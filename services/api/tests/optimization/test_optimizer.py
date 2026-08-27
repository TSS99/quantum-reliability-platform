"""Phase-7 optimizer: the properties that matter (RECON-19/20/21)."""
from app.optimization import Candidate, optimize, score, weights_for
from app.schemas.goal import ReliabilityGoal
from app.schemas.quantity import Quantity


def q(value: float, unit: str) -> Quantity:
    return Quantity(value=value, unit=unit, provenance="demo_fixture", method_ref="TEST")


def goal(priority: str = "balanced", *, max_cost: float = 80.0, max_runtime: float = 600.0, target_error: float = 0.02) -> ReliabilityGoal:
    return ReliabilityGoal(
        target_error=q(target_error, "expectation_value"),
        confidence_target=0.95,
        max_cost_usd=q(max_cost, "usd"),
        max_runtime_seconds=q(max_runtime, "seconds"),
        priority=priority,  # type: ignore[arg-type]
    )


def cand(cid: str, *, cost: float, rmse: float, qpu: float = 10.0) -> Candidate:
    return Candidate(candidate_id=cid, backend_id="demo", strategy_id=cid, estimated_cost_usd=cost, rmse=rmse, estimated_qpu_seconds=qpu)


def test_constraints_override_weights():
    # A cheap-but-inaccurate option is feasible; a very accurate one OVER budget is infeasible even
    # under maximize_accuracy — no weight can rescue a violated hard cap (RECON-19).
    cheap = cand("cheap", cost=5, rmse=0.05)
    accurate_expensive = cand("accurate", cost=500, rmse=0.001)
    res = optimize([cheap, accurate_expensive], goal("maximize_accuracy", max_cost=80))
    ids = {s.candidate.candidate_id for s in res.ranked}
    assert "accurate" not in ids  # over budget -> infeasible, never scored
    assert res.recommended_id == "cheap"
    assert any(s.candidate.candidate_id == "accurate" and s.feasibility == "infeasible" for s in res.infeasible)


def test_infeasible_is_never_recommended():
    res = optimize([cand("a", cost=1000, rmse=0.001)], goal(max_cost=80))
    assert res.recommended_id is None
    assert res.preflight_status == "DO_NOT_RUN"


def test_scoring_is_deterministic_and_fixed_range():
    c = cand("x", cost=20, rmse=0.03)
    g = goal("balanced")
    w = weights_for(g)
    s1 = score(c, g, w)
    s2 = score(c, g, w)
    assert s1.total == s2.total  # not per-batch min-max: same input -> same score
    for t in s1.terms:
        assert 0.0 <= t.normalized_value <= 1.0


def test_priority_changes_the_ranking():
    # A clearly more-accurate (but pricier) option vs a cheap-but-inaccurate one. Which wins depends
    # entirely on the priority weights (RECON-20).
    low_err_pricey = cand("acc", cost=40, rmse=0.005)
    cheap_meh = cand("cheap", cost=10, rmse=0.15)
    accurate_first = optimize([low_err_pricey, cheap_meh], goal("maximize_accuracy"))
    cheap_first = optimize([low_err_pricey, cheap_meh], goal("minimize_cost"))
    assert accurate_first.recommended_id == "acc"
    assert cheap_first.recommended_id == "cheap"


def test_tie_break_flags_equal_scores():
    # Two identical candidates score identically; the deterministic tie-break is flagged so the UI
    # can show that the pick was a coin-flip resolved by rule, not a real difference.
    a = cand("a", cost=20, rmse=0.02)
    b = cand("b", cost=20, rmse=0.02)
    res = optimize([a, b], goal("balanced"))
    assert res.recommended_id is not None
    assert res.ranked[0].tie_break_applied is True


def test_warning_when_target_missed_but_feasible():
    res = optimize([cand("a", cost=10, rmse=0.10)], goal(target_error=0.02))
    assert res.recommended_id == "a"  # still the best available
    assert res.preflight_status == "RUN_WITH_WARNING"
