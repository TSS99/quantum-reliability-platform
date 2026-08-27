"""Shared invariants I-1..I-12 (DOMAIN_MODEL.md §4, §46).

Implemented once here and called from the Pydantic model validators in `app/schemas/`; never
re-implemented per feature. Each `check_*` function raises `ValueError` on violation, which Pydantic
`model_validator`/`field_validator` hooks surface as a normal validation error.

I-10 (planning_estimate provenance must render labeled) is a UI-rendering invariant, exercised by
frontend snapshot tests, not this backend schema layer.
I-12 (same seed+inputs => byte-identical optimize response) is an optimizer-behavior invariant
(Phase 7); nothing to check at the schema layer until that endpoint exists.
"""
from __future__ import annotations

import math
import re
from typing import Any

ID_PATTERN = re.compile(r"^(cf|cal|plan|run|rcpt|wl)_[0-9a-f]{16}$")

_NONNEGATIVE_UNITS = {"usd", "count", "ratio"}

_FIELD_UNIT_SUFFIX = {
    "usd": "_usd",
    "microseconds": "_us",
    "seconds": "_seconds",
}


def check_quantity(value: float, unit: str) -> None:
    """I-1 (finite; probability range), I-2 (usd/count/ratio >= 0), by `Quantity.unit`.

    `expectation_value` range is context-dependent (estimate vs error, I-1) and is NOT unit-decidable
    from the envelope alone — see `check_expectation_value`, called explicitly by the owning field.
    """
    if not math.isfinite(value):
        raise ValueError(f"Quantity.value must be finite, got {value!r}")
    if unit == "probability":
        if not (0.0 <= value <= 1.0):
            raise ValueError(f"probability quantity must be in [0, 1], got {value}")
    elif unit in _NONNEGATIVE_UNITS:
        if value < 0:
            raise ValueError(f"{unit} quantity must be >= 0, got {value}")
    # "seconds" / "microseconds" have no fixed physical upper bound; finiteness above is sufficient.


def check_expectation_value(value: float, *, is_error: bool) -> None:
    """I-1: unit `expectation_value` ⇒ [-1, 1] for an estimate of <O>, [0, 2] for an error on it.

    Called explicitly by fields carrying this semantic (e.g. `target_error`, `bias_estimate`, `rmse`
    with `is_error=True`; `raw_estimate`, `processed_estimate` with `is_error=False`).
    """
    lo, hi = (0.0, 2.0) if is_error else (-1.0, 1.0)
    if not (lo <= value <= hi):
        raise ValueError(f"expectation_value quantity must be in [{lo}, {hi}], got {value}")


def check_overhead_ratio(value: float) -> None:
    """I-2: overhead/inflation ratios (sampling_overhead, variance_inflation) are >= 1."""
    if value < 1:
        raise ValueError(f"overhead/inflation ratio must be >= 1, got {value}")


def check_field_unit_suffix(field_name: str, unit: str) -> None:
    """I-3: a `*_usd` / `*_us` / `*_seconds` field name must agree with `Quantity.unit`."""
    expected_suffix = _FIELD_UNIT_SUFFIX.get(unit)
    if expected_suffix and not field_name.endswith(expected_suffix):
        raise ValueError(f"field {field_name!r} with unit {unit!r} must end with {expected_suffix!r}")


def check_field_unit_suffixes(fields: dict[str, Any]) -> None:
    """I-3 applied to a `{field_name: Quantity | None}` mapping; `None` entries (optional fields) skip."""
    for field_name, quantity in fields.items():
        if quantity is not None:
            check_field_unit_suffix(field_name, quantity.unit)


def check_probability_confidence(value: float) -> None:
    """I-4: every probability-typed confidence is in [0, 1]."""
    if not (0.0 <= value <= 1.0):
        raise ValueError(f"probability-typed confidence must be in [0, 1], got {value}")


def check_rmse(bias: float, std: float, rmse: float, *, tol: float = 1e-12) -> None:
    """I-5: rmse == sqrt(bias^2 + std^2) within 1e-12."""
    expected = math.sqrt(bias**2 + std**2)
    if abs(expected - rmse) > tol:
        raise ValueError(f"rmse {rmse} != sqrt(bias^2 + std^2) = {expected}")


def check_infeasible_not_scored_or_recommended(
    feasibility: str, score: Any, is_recommended: bool
) -> None:
    """I-6: infeasible => score is None and is_recommended is False."""
    if feasibility == "infeasible":
        if score is not None:
            raise ValueError("an infeasible plan must have score=None")
        if is_recommended:
            raise ValueError("an infeasible plan cannot be is_recommended=True")


def check_demo_replay_actuals_null(
    execution_mode: str, actual_runtime_seconds: Any, actual_cost_usd: Any
) -> None:
    """I-7: execution_mode == 'demo_replay' => actual_runtime_seconds and actual_cost_usd are None."""
    if execution_mode == "demo_replay" and (
        actual_runtime_seconds is not None or actual_cost_usd is not None
    ):
        raise ValueError(
            "execution_mode='demo_replay' requires actual_runtime_seconds and actual_cost_usd to be None"
        )


def check_id_format(id_value: str) -> None:
    """I-8 (format half): id matches ^(cf|cal|plan|run|rcpt|wl)_[0-9a-f]{16}$.

    Re-derivation (the other half of I-8) is exercised directly against `app/domain/ids.py` in tests.
    """
    if not ID_PATTERN.match(id_value):
        raise ValueError(f"id {id_value!r} does not match {ID_PATTERN.pattern!r}")


def check_observable_normalized(pauli_terms: list[Any], normalized: bool, *, tol: float = 1e-9) -> None:
    """I-9: Observable.normalized => sum(|coefficient|) == 1 within 1e-9."""
    if normalized:
        total = sum(abs(term.coefficient) for term in pauli_terms)
        if abs(total - 1.0) > tol:
            raise ValueError(f"normalized Observable must have sum(|coefficient|) == 1, got {total}")


def check_strategy_executable_for_run(strategy_executable: bool) -> None:
    """I-11: a strategy with executable=False (PEC, RECON-13) may never back an ExperimentRun.

    Schema-level, ExperimentRun only carries `plan_id`, not the strategy — so this must be called by
    the experiment-creation service (Phase 5+ `POST /api/v1/experiments`) after resolving the plan.
    """
    if not strategy_executable:
        raise ValueError("a plan whose strategy.executable is False cannot back an ExperimentRun")
