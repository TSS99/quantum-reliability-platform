"""`QuantumWorkload` — what the user wants to run (DOMAIN_MODEL.md §3.1)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator

from app.domain.invariants import check_observable_normalized


class PauliTerm(BaseModel):
    pauli: str  # e.g. "ZZII", length == qubit_count
    coefficient: float


class Observable(BaseModel):
    """A normalized observable whose expectation lies in [-1, 1] (RECON-14)."""

    name: str
    pauli_terms: list[PauliTerm]
    normalized: bool = True

    @model_validator(mode="after")
    def _check_normalized(self) -> "Observable":
        check_observable_normalized(self.pauli_terms, self.normalized)
        return self


class QuantumWorkload(BaseModel):
    workload_id: str
    name: str
    source: Literal["example", "pasted_qasm", "uploaded_qasm"]
    qasm: str  # OpenQASM 3 text; validated per RECON-31 before parse
    observable: Observable  # REQUIRED — RECON-14
    description: str | None = None
    tags: list[str] = []
