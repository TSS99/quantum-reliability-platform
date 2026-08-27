"""Logical-error-rate statistics QRP owns and therefore tests (QEC_METHODS.md §6).

Deliberately dependency-free (no numpy, no scipy): the Wilson interval and the per-round transform
are ten lines each and are the two places this feature is most likely to be silently wrong.
"""
from __future__ import annotations

import math

Z_95 = 1.96
INSUFFICIENT_STATISTICS_THRESHOLD = 50


def wilson_interval(k: int, n: int, z: float = Z_95) -> tuple[float, float]:
    """§6.3: 95% Wilson score interval. Correct at k=0 and small P_L, where Wald is not."""
    if n < 1:
        raise ValueError(f"n must be >= 1, got {n}")
    if not (0 <= k <= n):
        raise ValueError(f"k must be in [0, n], got k={k}, n={n}")
    denom = n + z**2
    centre = (k + z**2 / 2) / denom
    half = (z / denom) * math.sqrt(k * (n - k) / n + z**2 / 4)
    return max(0.0, centre - half), min(1.0, centre + half)


def per_round_rate(p_experiment: float, rounds: int) -> float | None:
    """§6.2: invert the composition of `rounds` independent Bernoulli(p_round) flips.

    Returns None (never NaN, never a clamped value) at P_L >= 0.5, where the code is deep past
    threshold and the quantity is meaningless — reason `beyond_random_guessing`.
    """
    if rounds < 1:
        raise ValueError(f"rounds must be >= 1, got {rounds}")
    if p_experiment >= 0.5:
        return None
    return (1.0 - (1.0 - 2.0 * p_experiment) ** (1.0 / rounds)) / 2.0


def summarize(k: int, n: int, rounds: int) -> dict[str, object]:
    """Both rates (§6.1, §6.2), both CIs (§6.3), and the honesty flags (§6.4)."""
    rate = k / n
    ci_low, ci_high = wilson_interval(k, n)
    # The §6.2 transform is monotone increasing on [0, 0.5), so it maps the CI endpoints to the
    # per-round CI endpoints directly. An endpoint at or beyond 0.5 yields None on that side.
    return {
        "shots": n,
        "logical_errors": k,
        "logical_error_rate": rate,
        "ler_ci_low": ci_low,
        "ler_ci_high": ci_high,
        "logical_error_rate_per_round": per_round_rate(rate, rounds),
        "lerpr_ci_low": per_round_rate(ci_low, rounds),
        "lerpr_ci_high": per_round_rate(ci_high, rounds),
        "per_round_null_reason": None if rate < 0.5 else "beyond_random_guessing",
        "insufficient_statistics": k < INSUFFICIENT_STATISTICS_THRESHOLD,
    }
