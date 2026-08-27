"""`ExecutionPlan` — a scored, feasibility-checked candidate (DOMAIN_MODEL.md §3.7)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.domain.invariants import (
    check_expectation_value,
    check_id_format,
    check_infeasible_not_scored_or_recommended,
    check_overhead_ratio,
    check_rmse,
)
from app.schemas.common import StatisticalConfidence, StrategyConfidence
from app.schemas.goal import ScoreWeights
from app.schemas.quantity import Quantity
from app.domain.reason_codes import Finding
from app.schemas.strategy import MitigationStrategy


class CostEstimate(BaseModel):
    estimated_cost_usd: Quantity  # >= 0, provenance "heuristic" or "demo_fixture"
    estimated_qpu_seconds: Quantity
    estimated_queue_seconds: Quantity | None
    minimum_charge_usd: Quantity | None
    pricing_model_ref: str  # §52 config key; no live pricing in V1


class ReliabilityEstimate(BaseModel):
    """RECON-12. A scalar 'expected error' is FORBIDDEN: ZNE/PEC trade bias for variance."""

    bias_estimate: Quantity  # heuristic, unit "expectation_value"
    stat_std: Quantity  # computable, unit "expectation_value"
    rmse: Quantity  # sqrt(bias^2 + std^2); what the optimizer consumes
    statistical_confidence: StatisticalConfidence
    strategy_confidence: StrategyConfidence
    sampling_overhead: Quantity  # unit "ratio", >= 1
    variance_inflation: Quantity  # unit "ratio", >= 1 (readout mitigation is never < 1)
    method_ref: str

    @model_validator(mode="after")
    def _check_invariants(self) -> "ReliabilityEstimate":
        check_expectation_value(self.bias_estimate.value, is_error=True)
        check_expectation_value(self.stat_std.value, is_error=True)
        check_expectation_value(self.rmse.value, is_error=True)
        check_rmse(self.bias_estimate.value, self.stat_std.value, self.rmse.value)
        check_overhead_ratio(self.sampling_overhead.value)
        check_overhead_ratio(self.variance_inflation.value)
        return self


class ScoreTerm(BaseModel):
    key: Literal["error", "cost", "time", "qubit_overhead", "decoder_latency"]
    raw_value: float
    normalized_value: float = Field(ge=0.0, le=1.0)
    weight: float
    contribution: float  # normalized_value * weight


class ScoreBreakdown(BaseModel):
    """RECON-20: interpretable, with fixed documented normalization ranges — NOT per-batch min-max."""

    total: float
    terms: list[ScoreTerm]
    weights: ScoreWeights
    normalization_ref: str  # doc anchor for the fixed ranges
    tie_break_applied: bool  # deterministic epsilon tie-break: lower cost wins


class ExecutionPlan(BaseModel):
    plan_id: str
    circuit_fingerprint: str
    backend_id: str
    calibration_snapshot_id: str
    strategy: MitigationStrategy
    shots: int
    cost_estimate: CostEstimate
    reliability_estimate: ReliabilityEstimate
    feasibility: Literal["feasible", "infeasible"]
    findings: list[Finding]  # Stage-A violations; non-empty when infeasible
    score: ScoreBreakdown | None  # null when infeasible — infeasible plans are NOT scored
    is_recommended: bool  # at most one true per optimize response
    seed: int

    @model_validator(mode="after")
    def _check_invariants(self) -> "ExecutionPlan":
        check_id_format(self.plan_id)
        check_id_format(self.circuit_fingerprint)
        check_id_format(self.calibration_snapshot_id)
        check_infeasible_not_scored_or_recommended(self.feasibility, self.score, self.is_recommended)
        return self
