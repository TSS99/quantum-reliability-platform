"""QEC_METHODS.md §6 — the math QRP owns, so QRP tests it."""
from __future__ import annotations

import pytest

from app.qec.statistics import per_round_rate, summarize, wilson_interval


def half_width(k: int, n: int) -> float:
    lo, hi = wilson_interval(k, n)
    return hi - lo


def test_wilson_at_zero_errors_is_a_real_upper_bound():
    lo, hi = wilson_interval(0, 10_000)
    assert lo == 0.0
    assert 0.0 < hi < 0.001


def test_more_shots_tighten_the_interval():
    # §8.5: half-width shrinks ~1/sqrt(n) at a fixed observed rate.
    assert half_width(100, 10_000) < half_width(10, 1_000)
    assert half_width(1_000, 100_000) < half_width(100, 10_000)


def test_wilson_rejects_impossible_counts():
    with pytest.raises(ValueError):
        wilson_interval(11, 10)
    with pytest.raises(ValueError):
        wilson_interval(0, 0)


def test_per_round_is_identity_at_one_round():
    # §8.10
    for rate in (0.0, 1e-6, 0.01, 0.4999):
        assert per_round_rate(rate, 1) == pytest.approx(rate)


def test_per_round_inverts_bernoulli_composition():
    # Composing `rounds` flips at p_round must reproduce the experiment rate.
    rounds, experiment = 7, 0.12
    p_round = per_round_rate(experiment, rounds)
    recomposed = (1.0 - (1.0 - 2.0 * p_round) ** rounds) / 2.0
    assert recomposed == pytest.approx(experiment)


def test_per_round_is_null_beyond_random_guessing():
    # §6.2: null with a reason, never NaN and never clamped.
    assert per_round_rate(0.5, 5) is None
    assert per_round_rate(0.7, 5) is None
    assert summarize(600, 1_000, 5)["per_round_null_reason"] == "beyond_random_guessing"


def test_summarize_flags_insufficient_statistics():
    assert summarize(49, 100_000, 3)["insufficient_statistics"] is True
    assert summarize(50, 100_000, 3)["insufficient_statistics"] is False
    assert summarize(0, 100_000, 3)["logical_error_rate"] == 0.0
