"""`ReliabilityGoal` — the SLO (DOMAIN_MODEL.md §3.5, Gap D)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator

from app.domain.invariants import check_expectation_value, check_probability_confidence
from app.schemas.quantity import Quantity


class ScoreWeights(BaseModel):
    """§29. Presets map to fixed, documented weight vectors; they are not free-floating."""

    w_error: float
    w_cost: float
    w_time: float
    w_qubit_overhead: float  # QEC only; 0 for QEM-only plans
    w_decoder_latency: float  # QEC only; 0 for QEM-only plans


class ReliabilityGoal(BaseModel):
    target_error: Quantity  # unit "expectation_value"; see DOMAIN_MODEL.md §1.3
    confidence_target: float  # 0..1; refers to StatisticalConfidence.level
    max_cost_usd: Quantity  # unit "usd", >= 0
    max_runtime_seconds: Quantity  # unit "seconds", >= 0
    priority: Literal["minimize_cost", "balanced", "maximize_accuracy", "custom"]
    weights: ScoreWeights | None = None  # required iff priority == "custom"

    @model_validator(mode="after")
    def _check_invariants(self) -> "ReliabilityGoal":
        check_expectation_value(self.target_error.value, is_error=True)
        check_probability_confidence(self.confidence_target)
        if self.priority == "custom" and self.weights is None:
            raise ValueError("weights is required when priority == 'custom'")
        if self.priority != "custom" and self.weights is not None:
            raise ValueError("weights must be None unless priority == 'custom'")
        return self
