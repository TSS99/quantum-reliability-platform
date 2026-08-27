"""`CircuitProfile` — what the circuit *is*, output of Flow-A step `analyze` (DOMAIN_MODEL.md §3.2)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.domain.invariants import check_id_format
from app.schemas.quantity import Provenance, Quantity


class CircuitProfile(BaseModel):
    circuit_fingerprint: str
    workload_id: str
    qubit_count: int
    depth: int
    gate_count: int
    two_qubit_gate_count: int
    measurement_count: int
    gate_histogram: dict[str, int]
    two_qubit_ratio: float = Field(ge=0.0, le=1.0)
    parameter_count: int
    connectivity_class: Literal["linear", "star", "grid", "all_to_all", "irregular"]
    idle_exposure: Quantity  # unit "microseconds"; gates DD could act on
    has_dynamic_circuits: bool  # mid-circuit measurement / feed-forward
    has_mid_circuit_measurement: bool
    observable_count: int
    analysis_provenance: Provenance

    @model_validator(mode="after")
    def _check_invariants(self) -> "CircuitProfile":
        check_id_format(self.circuit_fingerprint)
        return self
