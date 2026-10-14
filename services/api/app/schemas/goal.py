"""`ReliabilityGoal` — the SLO (DOMAIN_MODEL.md §3.5, Gap D)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

from app.domain.invariants import check_expectation_value, check_probability_confidence
from app.schemas.quantity import Quantity

TaskType = Literal["observable", "sampling"]
TaskMetric = Literal["absolute_expectation_error", "total_variation_distance"]


class TaskSpec(BaseModel):
    """WHAT is being estimated (mirrors apps/web/src/services/contracts.ts `TaskSpec`).

    Not cosmetic: it decides which error metric the target is expressed in, and therefore which
    strategies can even be considered. An expectation-value technique like ZNE has no meaning for a
    sampling task, so the optimizer refuses one rather than scoring it with the wrong model.
    """

    model_config = ConfigDict(extra="forbid")

    type: TaskType
    metric: TaskMetric
    observable: str | None = None  # Pauli string, one symbol per qubit. Null for sampling tasks.

    @model_validator(mode="after")
    def _check_invariants(self) -> "TaskSpec":
        if self.type == "observable":
            if self.metric != "absolute_expectation_error":
                raise ValueError("task.type == 'observable' requires metric == 'absolute_expectation_error'")
            if self.observable is None:
                raise ValueError("task.type == 'observable' requires a non-null observable")
        else:
            if self.metric != "total_variation_distance":
                raise ValueError("task.type == 'sampling' requires metric == 'total_variation_distance'")
            if self.observable is not None:
                raise ValueError("task.type == 'sampling' requires observable == null")
        return self


class ScoreWeights(BaseModel):
    """§29. Presets map to fixed, documented weight vectors; they are not free-floating."""

    model_config = ConfigDict(extra="forbid")

    w_error: float
    w_cost: float
    w_time: float
    w_qubit_overhead: float  # QEC only; 0 for QEM-only plans
    w_decoder_latency: float  # QEC only; 0 for QEM-only plans


class ReliabilityGoal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_error: Quantity  # unit "expectation_value"; see DOMAIN_MODEL.md §1.3
    task: TaskSpec  # what is being estimated; the optimizer refuses a task it has no model for
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
