"""`CalibrationSnapshot` — the device at a moment, plus its drift verdict (DOMAIN_MODEL.md §3.4)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, model_validator

from app.domain.invariants import check_field_unit_suffixes, check_id_format
from app.schemas.quantity import Quantity
from app.schemas.reason_codes import Finding

_QUANTITY_SUFFIX_FIELDS = ("t1_us", "t2_us", "measurement_time_us")


class CalibrationMetrics(BaseModel):
    t1_us: Quantity | None
    t2_us: Quantity | None
    single_qubit_error_rate: Quantity | None  # unit "probability"
    two_qubit_error_rate: Quantity | None
    readout_error_rate: Quantity | None
    measurement_time_us: Quantity | None
    per_qubit: dict[str, "CalibrationMetrics"] | None = None  # optional per-qubit detail

    @model_validator(mode="after")
    def _check_units(self) -> "CalibrationMetrics":
        check_field_unit_suffixes(
            {name: getattr(self, name) for name in _QUANTITY_SUFFIX_FIELDS}
        )
        return self


class CalibrationValidity(BaseModel):
    state: Literal["stable", "watch", "stale", "significant_drift"]
    thresholds_ref: str  # config key; thresholds are DISPLAYED, not hidden (§21)
    explanation: str  # deterministic template, never free prose
    drift_findings: list[Finding]  # may include CALIBRATION_STALE


class CalibrationSnapshot(BaseModel):
    calibration_snapshot_id: str
    backend_id: str
    captured_at: datetime
    age_seconds: float  # computed against request time
    metrics: CalibrationMetrics
    validity: CalibrationValidity
    seed: int  # demo history is seeded (§33)

    @model_validator(mode="after")
    def _check_invariants(self) -> "CalibrationSnapshot":
        check_id_format(self.calibration_snapshot_id)
        return self
