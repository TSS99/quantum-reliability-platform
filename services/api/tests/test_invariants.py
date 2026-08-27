"""Domain invariants I-1..I-12 / MISSION §46 — tested directly on the shared validator."""
import pytest

from app.domain import invariants as inv


def test_overhead_ratio_ge_one():
    inv.check_overhead_ratio(1.0)
    inv.check_overhead_ratio(2.5)
    with pytest.raises(ValueError):
        inv.check_overhead_ratio(0.5)  # a strategy cannot need fewer shots than raw


def test_rmse_is_root_sum_square():
    inv.check_rmse(0.3, 0.4, 0.5)
    with pytest.raises(ValueError):
        inv.check_rmse(0.3, 0.4, 0.9)


def test_probability_confidence_in_unit_interval():
    inv.check_probability_confidence(0.0)
    inv.check_probability_confidence(1.0)
    with pytest.raises(ValueError):
        inv.check_probability_confidence(1.5)
    with pytest.raises(ValueError):
        inv.check_probability_confidence(-0.1)


def test_infeasible_cannot_be_scored_or_recommended():
    inv.check_infeasible_not_scored_or_recommended("infeasible", None, False)
    inv.check_infeasible_not_scored_or_recommended("feasible", 0.5, True)
    with pytest.raises(ValueError):
        inv.check_infeasible_not_scored_or_recommended("infeasible", 0.5, False)
    with pytest.raises(ValueError):
        inv.check_infeasible_not_scored_or_recommended("infeasible", None, True)


def test_demo_replay_forbids_actual_measurements():
    inv.check_demo_replay_actuals_null("demo_replay", None, None)
    inv.check_demo_replay_actuals_null("hardware", 1.0, 2.0)
    with pytest.raises(ValueError):
        inv.check_demo_replay_actuals_null("demo_replay", 1.0, None)
    with pytest.raises(ValueError):
        inv.check_demo_replay_actuals_null("demo_replay", None, 2.0)
