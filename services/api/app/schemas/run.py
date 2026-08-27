"""`ExperimentRun` — what actually happened (DOMAIN_MODEL.md §3.8)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, model_validator

from app.domain.invariants import (
    check_demo_replay_actuals_null,
    check_expectation_value,
    check_id_format,
)
from app.schemas.common import StatisticalConfidence
from app.schemas.quantity import Quantity
from app.domain.reason_codes import Finding

ExecutionMode = Literal["demo_replay", "local_simulation", "hardware"]


class Lineage(BaseModel):
    """§32 — reproducibility, not decoration."""

    qrp_version: str
    schema_version: str
    seed: int
    circuit_fingerprint: str
    calibration_snapshot_id: str
    library_versions: dict[str, str]  # e.g. stim, pymatching, sinter, qiskit, numpy
    generated_at: datetime


class ExperimentRun(BaseModel):
    run_id: str
    plan_id: str
    execution_mode: ExecutionMode  # RECON-8, mandatory
    started_at: datetime
    completed_at: datetime | None
    status: Literal["completed", "failed"]
    shots: int
    seed: int
    raw_estimate: Quantity  # unmitigated <O>
    processed_estimate: Quantity  # after the strategy
    statistical_confidence: StatisticalConfidence
    actual_runtime_seconds: Quantity | None  # null iff execution_mode == "demo_replay"
    actual_cost_usd: Quantity | None  # null iff execution_mode == "demo_replay"
    lineage: Lineage
    warnings: list[Finding] = []

    @model_validator(mode="after")
    def _check_invariants(self) -> "ExperimentRun":
        check_id_format(self.run_id)
        check_id_format(self.plan_id)
        check_expectation_value(self.raw_estimate.value, is_error=False)
        check_expectation_value(self.processed_estimate.value, is_error=False)
        check_demo_replay_actuals_null(
            self.execution_mode, self.actual_runtime_seconds, self.actual_cost_usd
        )
        return self
