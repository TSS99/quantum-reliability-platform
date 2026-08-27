"""The bias/variance model against the QEM_METHODS.md section 8 invariants (MISSION section 46)."""
from __future__ import annotations

import math
from dataclasses import replace

import pytest

from app.qem.model import (
    ErrorBudget,
    combine_residuals,
    estimate,
    pec_gamma_squared,
    readout_v_amp,
    zne_residuals,
)

BUDGET = ErrorBudget(e_1q=0.02, e_2q=0.12, e_idle=0.03, e_ro=0.05)
NOISELESS = ErrorBudget()

STRATEGIES = [
    (),
    ("readout_mitigation",),
    ("dynamical_decoupling", "readout_mitigation"),
    ("pauli_twirling",),
    ("zne",),
    ("zne", "readout_mitigation"),
    ("dynamical_decoupling", "zne", "readout_mitigation"),
]

KWARGS = {"num_measured_qubits": 4, "mean_readout_error": 0.02}


@pytest.mark.parametrize("techniques", STRATEGIES)
def test_shot_multiplier_is_a_multiplier_never_below_one(techniques):
    """Invariant 1/2: overhead >= 0 means shot_multiplier >= 1, not >= 0."""
    assert estimate(techniques, BUDGET, 4096, **KWARGS).shot_multiplier >= 1.0


@pytest.mark.parametrize("techniques", STRATEGIES)
def test_rmse_is_exactly_the_quadrature_sum(techniques):
    """Invariant 3."""
    e = estimate(techniques, BUDGET, 4096, **KWARGS)
    assert e.rmse == pytest.approx(math.sqrt(e.bias_estimate**2 + e.stat_std**2), rel=1e-12)
    assert e.rmse >= max(abs(e.bias_estimate), e.stat_std)


@pytest.mark.parametrize("techniques", STRATEGIES)
def test_zero_noise_limit_has_zero_bias(techniques):
    """Invariant 4: with every epsilon = 0, no strategy may claim a bias."""
    e = estimate(techniques, NOISELESS, 4096, num_measured_qubits=4, mean_readout_error=0.0)
    assert e.bias_estimate == 0.0
    assert e.rmse == pytest.approx(e.stat_std)


def test_stat_std_falls_as_one_over_sqrt_n():
    """Invariant 2."""
    a = estimate((), BUDGET, 1000).stat_std
    b = estimate((), BUDGET, 4000).stat_std
    assert b == pytest.approx(a / 2.0)


def test_raw_bias_is_monotone_in_every_channel():
    """Invariant 5."""
    base = estimate((), BUDGET, 4096).bias_estimate
    for channel in ("e_1q", "e_2q", "e_idle", "e_ro"):
        worse = replace(BUDGET, **{channel: getattr(BUDGET, channel) + 0.01})
        assert estimate((), worse, 4096).bias_estimate > base


def test_twirling_alone_changes_nothing():
    """RECON-13: twirling tailors noise, it does not reduce average bias — so it is not a strategy."""
    raw = estimate((), BUDGET, 4096)
    twirled = estimate(("pauli_twirling",), BUDGET, 4096)
    assert twirled.bias_estimate == pytest.approx(raw.bias_estimate)
    assert twirled.shot_multiplier == pytest.approx(raw.shot_multiplier)


@pytest.mark.parametrize("techniques", [s for s in STRATEGIES if s not in ((), ("pauli_twirling",))])
def test_no_free_lunch(techniques):
    """Invariant 6: bias reduction is always paid for in variance."""
    raw = estimate((), BUDGET, 4096, **KWARGS)
    mitigated = estimate(techniques, BUDGET, 4096, **KWARGS)
    if mitigated.bias_estimate < raw.bias_estimate:
        assert mitigated.shot_multiplier > raw.shot_multiplier


def test_readout_mitigation_cuts_readout_bias_and_amplifies_variance():
    raw = estimate((), BUDGET, 4096, **KWARGS)
    mitigated = estimate(("readout_mitigation",), BUDGET, 4096, **KWARGS)
    assert mitigated.bias_estimate < raw.bias_estimate
    assert mitigated.shot_multiplier > 1.0


def test_readout_v_amp_is_one_with_perfect_readout():
    assert readout_v_amp(8, 0.0) == pytest.approx(1.0)
    assert readout_v_amp(8, 0.02) > 1.0


def test_zne_reports_no_benefit_in_the_high_noise_regime():
    """Section 5.7: the min(1, ...) cap must report no benefit rather than invent one."""
    loud = ErrorBudget(e_1q=0.2, e_2q=0.4, e_idle=0.1, e_ro=0.05)
    assert zne_residuals(loud, (1, 3, 5))["e_2q"] == 1.0
    quiet = ErrorBudget(e_1q=0.005, e_2q=0.02, e_idle=0.005, e_ro=0.05)
    assert zne_residuals(quiet, (1, 3, 5))["e_2q"] < 1.0


def test_zne_never_touches_the_readout_channel():
    assert zne_residuals(BUDGET, (1, 3, 5))["e_ro"] == 1.0


def test_untwirled_zne_is_less_confident():
    guarded = estimate(("zne",), BUDGET, 4096, twirling=True)
    unguarded = estimate(("zne",), BUDGET, 4096, twirling=False)
    assert unguarded.strategy_confidence < guarded.strategy_confidence


@pytest.mark.parametrize("techniques", STRATEGIES)
def test_confidences_are_separate_bounded_quantities(techniques):
    """Invariant 13: two different quantities, never merged, never equal by construction."""
    e = estimate(techniques, BUDGET, 4096, **KWARGS)
    assert 0.0 <= e.strategy_confidence < 1.0
    assert 0.0 <= e.statistical_confidence <= 1.0
    assert e.strategy_confidence != e.statistical_confidence


@pytest.mark.parametrize("techniques", STRATEGIES)
def test_every_estimate_is_labelled_heuristic(techniques):
    """Invariant 14: no QEM output ever claims to be measured."""
    assert estimate(techniques, BUDGET, 4096, **KWARGS).provenance == "heuristic"


def test_a_channel_touched_twice_takes_the_conservative_residual():
    idle_only = {"e_1q": 1.0, "e_2q": 1.0, "e_idle": 0.40, "e_ro": 1.0}
    weaker = {"e_1q": 1.0, "e_2q": 1.0, "e_idle": 0.80, "e_ro": 1.0}
    assert combine_residuals([idle_only, weaker])["e_idle"] == 0.80
    # An untouched channel (r = 1) is the identity, not a veto.
    readout = {"e_1q": 1.0, "e_2q": 1.0, "e_idle": 1.0, "e_ro": 0.10}
    assert combine_residuals([idle_only, readout])["e_idle"] == 0.40


def test_pec_is_a_calculator_not_a_strategy():
    with pytest.raises(ValueError):
        estimate(("pec",), BUDGET, 4096)
    assert pec_gamma_squared([]) == 1.0
    assert pec_gamma_squared([0.01] * 24) > 1.0
