"""The bias/variance reliability model (QEM_METHODS.md sections 2, 3, 5.7; RECON-12).

Every number this module returns is `provenance='heuristic'`: a model output, never a measurement.
The residual factors and variance amplifications below are the documented V1 constants — fitted,
configurable, and not universal physical constants (MISSION section 21).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Sequence

CHANNELS = ("e_1q", "e_2q", "e_idle", "e_ro")

PROVENANCE = "heuristic"

#: Base heuristic confidence in a `bias_estimate`. Always < 1 (section 2); a separate quantity from
#: `statistical_confidence`, and never merged with it (RECON-9).
BASE_STRATEGY_CONFIDENCE = 0.6

#: ZNE without the twirling modifier: the smooth-scaling assumption is unguarded (section 5.7).
UNTWIRLED_ZNE_CONFIDENCE_FACTOR = 0.7

#: Residual factor r_channel in (0, 1] left by each strategy. r = 1 means "does nothing here".
#: ZNE's residual depends on the noise level and is computed by `zne_residuals`.
RESIDUALS: dict[str, dict[str, float]] = {
    "raw": {"e_1q": 1.0, "e_2q": 1.0, "e_idle": 1.0, "e_ro": 1.0},
    "readout_mitigation": {"e_1q": 1.0, "e_2q": 1.0, "e_idle": 1.0, "e_ro": 0.10},
    "dynamical_decoupling": {"e_1q": 1.0, "e_2q": 1.0, "e_idle": 0.40, "e_ro": 1.0},
    "pauli_twirling": {"e_1q": 1.0, "e_2q": 1.0, "e_idle": 1.0, "e_ro": 1.0},
}

#: Variance amplification V_amp of ZNE, by scale-factor set (section 5.7).
ZNE_V_AMP: dict[tuple[int, ...], float] = {(1, 3): 5.0, (1, 3, 5): 15.7}


@dataclass(frozen=True)
class ErrorBudget:
    """Accumulated error per channel, from the CircuitProfile x CalibrationSnapshot (section 2.2)."""

    e_1q: float = 0.0
    e_2q: float = 0.0
    e_idle: float = 0.0
    e_ro: float = 0.0

    def total(self) -> float:
        return self.e_1q + self.e_2q + self.e_idle + self.e_ro

    def coherent(self) -> float:
        """The part that grows with a ZNE folding factor. Readout error does not (section 5.7)."""
        return self.e_1q + self.e_2q + self.e_idle


@dataclass(frozen=True)
class ReliabilityEstimate:
    """bias and variance are reported separately; a single 'expected error' is forbidden."""

    bias_estimate: float
    stat_std: float
    rmse: float
    shot_multiplier: float
    statistical_confidence: float
    strategy_confidence: float
    provenance: str = PROVENANCE


def zne_residuals(budget: ErrorBudget, scale_factors: Sequence[int]) -> dict[str, float]:
    """rho = min(1, (lambda_max * E_coherent)^(m-1)); readout is untouched by folding."""
    m = len(scale_factors)
    if m < 2:
        raise ValueError("ZNE needs at least two scale factors")
    rho = min(1.0, (max(scale_factors) * budget.coherent()) ** (m - 1))
    return {"e_1q": rho, "e_2q": rho, "e_idle": rho, "e_ro": 1.0}


def readout_v_amp(num_measured_qubits: int, mean_readout_error: float) -> float:
    """(1 - 2*eps_bar)^(-2n) — un-inverting an assignment matrix amplifies shot noise."""
    if not 0.0 <= mean_readout_error < 0.5:
        raise ValueError("mean readout error must be in [0, 0.5)")
    return (1.0 - 2.0 * mean_readout_error) ** (-2 * num_measured_qubits)


def pec_gamma(gate_errors: Iterable[float]) -> float:
    """Depolarizing approximation of the quasi-probability one-norm (QEM_METHODS.md 5.5)."""
    gamma = 1.0
    for eps in gate_errors:
        if not 0.0 <= eps < 1.0:
            raise ValueError("gate error must be in [0, 1)")
        gamma *= (1.0 + eps) / (1.0 - eps)
    return gamma


def pec_gamma_squared(gate_errors: Iterable[float]) -> float:
    """The shot multiplier PEC would need. Calculator only — PEC never executes in V1."""
    return pec_gamma(gate_errors) ** 2


def combine_residuals(per_technique: Sequence[dict[str, float]]) -> dict[str, float]:
    """Per channel, the conservative residual among the techniques that actually act there.

    Section 5.7: a channel touched by two techniques is not corrected twice as well, so the larger
    (worse) residual wins. A technique with r = 1 does not act on the channel at all and is the
    identity here — it must not veto a technique that does.
    """
    combined: dict[str, float] = {}
    for channel in CHANNELS:
        acting = [r[channel] for r in per_technique if r.get(channel, 1.0) < 1.0]
        combined[channel] = max(acting) if acting else 1.0
    return combined


def bias(budget: ErrorBudget, residuals: dict[str, float]) -> float:
    """1 - exp(-sum r_c * E_c), the global depolarizing approximation with |<O>_ideal| = 1."""
    exponent = sum(residuals[c] * getattr(budget, c) for c in CHANNELS)
    return 1.0 - math.exp(-exponent)


def stat_std(v_amp: float, n_shots: int, o_est: float = 0.0) -> float:
    """sqrt(V_amp) * sqrt((1 - <O>^2) / N). Exact formula over modelled inputs."""
    if n_shots <= 0:
        raise ValueError("n_shots must be positive")
    return math.sqrt(v_amp) * math.sqrt((1.0 - o_est**2) / n_shots)


def estimate(
    technique_ids: Sequence[str],
    budget: ErrorBudget,
    n_shots: int,
    *,
    num_measured_qubits: int = 0,
    mean_readout_error: float = 0.0,
    scale_factors: Sequence[int] = (1, 3, 5),
    twirling: bool = False,
    o_est: float = 0.0,
    statistical_confidence: float = 0.95,
) -> ReliabilityEstimate:
    """The heuristic ReliabilityEstimate for one strategy (a set of technique ids).

    `pec` is rejected: it is a calculator, not an executable strategy (RECON-13). Use
    `pec_gamma_squared` for its overhead number.
    """
    if "pec" in technique_ids:
        raise ValueError("PEC does not execute in V1; use pec_gamma_squared for its overhead")

    residual_sets, v_amp = [], 1.0
    for tid in technique_ids:
        if tid == "zne":
            residual_sets.append(zne_residuals(budget, scale_factors))
            v_amp *= ZNE_V_AMP[tuple(scale_factors)]
        elif tid == "readout_mitigation":
            residual_sets.append(RESIDUALS[tid])
            v_amp *= readout_v_amp(num_measured_qubits, mean_readout_error)
        else:
            residual_sets.append(RESIDUALS[tid])

    b = bias(budget, combine_residuals(residual_sets or [RESIDUALS["raw"]]))
    s = stat_std(v_amp, n_shots, o_est)
    confidence = BASE_STRATEGY_CONFIDENCE
    if "zne" in technique_ids and not twirling:
        confidence *= UNTWIRLED_ZNE_CONFIDENCE_FACTOR
    return ReliabilityEstimate(
        bias_estimate=b,
        stat_std=s,
        rmse=math.sqrt(b**2 + s**2),
        shot_multiplier=v_amp,
        statistical_confidence=statistical_confidence,
        strategy_confidence=confidence,
    )
