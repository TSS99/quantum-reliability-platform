"""`ReliabilityReceipt` — the Gap-B evidence artifact (DOMAIN_MODEL.md §3.9)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, model_validator

from app.domain.invariants import (
    check_demo_replay_actuals_null,
    check_expectation_value,
    check_id_format,
)
from app.domain.reason_codes import Finding
from app.schemas.common import StatisticalConfidence, StrategyConfidence
from app.schemas.goal import ReliabilityGoal
from app.schemas.quantity import Quantity
from app.schemas.run import ExecutionMode, Lineage
from app.schemas.strategy import MitigationStrategy
from app.schemas.workload import Observable


class ReliabilityReceipt(BaseModel):
    receipt_id: str
    schema_version: str  # RECON-8 — of THIS receipt schema
    qrp_version: str  # RECON-8 — of the software that produced it
    execution_mode: ExecutionMode  # RECON-8 — mandatory, no default
    run_id: str
    generated_at: datetime

    # what was run
    circuit_fingerprint: str
    workload_name: str
    observable: Observable
    backend_id: str
    calibration_snapshot_id: str
    strategy: MitigationStrategy
    shots: int

    # what came out
    raw_estimate: Quantity
    processed_estimate: Quantity
    statistical_confidence: StatisticalConfidence
    strategy_confidence: StrategyConfidence
    improvement: Quantity | None  # |raw - processed| on <O>; null if not computable

    # what it cost
    estimated_runtime_seconds: Quantity
    estimated_cost_usd: Quantity
    actual_runtime_seconds: Quantity | None  # null iff execution_mode == "demo_replay"
    actual_cost_usd: Quantity | None  # null iff execution_mode == "demo_replay"

    # whether it met the promise
    goal: ReliabilityGoal
    goal_result: Literal["met", "not_met", "indeterminate"]
    warnings: list[Finding]
    lineage: Lineage

    @model_validator(mode="after")
    def _check_invariants(self) -> "ReliabilityReceipt":
        check_id_format(self.receipt_id)
        check_id_format(self.run_id)
        check_id_format(self.circuit_fingerprint)
        check_id_format(self.calibration_snapshot_id)
        check_expectation_value(self.raw_estimate.value, is_error=False)
        check_expectation_value(self.processed_estimate.value, is_error=False)
        if self.improvement is not None:
            check_expectation_value(self.improvement.value, is_error=True)
        check_demo_replay_actuals_null(
            self.execution_mode, self.actual_runtime_seconds, self.actual_cost_usd
        )
        if self.statistical_confidence.insufficient_statistics and self.goal_result == "met":
            raise ValueError(
                "goal_result cannot be 'met' when statistical_confidence.insufficient_statistics is True"
            )
        return self
