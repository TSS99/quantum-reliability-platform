"""Preset score weights (RECON-20). Priority selects a fixed, documented weight vector; 'custom'
carries its own on the ReliabilityGoal."""
from __future__ import annotations

from app.schemas.goal import ReliabilityGoal, ScoreWeights

PRESETS: dict[str, ScoreWeights] = {
    "minimize_cost": ScoreWeights(w_error=0.25, w_cost=0.55, w_time=0.20, w_qubit_overhead=0.0, w_decoder_latency=0.0),
    "balanced": ScoreWeights(w_error=0.40, w_cost=0.35, w_time=0.25, w_qubit_overhead=0.0, w_decoder_latency=0.0),
    "maximize_accuracy": ScoreWeights(w_error=0.70, w_cost=0.15, w_time=0.15, w_qubit_overhead=0.0, w_decoder_latency=0.0),
}


def weights_for(goal: ReliabilityGoal) -> ScoreWeights:
    if goal.priority == "custom":
        if goal.weights is None:
            raise ValueError("custom priority requires explicit weights")
        return goal.weights
    return PRESETS[goal.priority]
