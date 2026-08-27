"""The `Quantity` envelope — every physical or estimated number (DOMAIN_MODEL.md §1.1, RECON-3).

Exact structural integers (qubit_count, depth, shots, seed, ...) are plain `int` and never wrapped
(DOMAIN_MODEL.md §1.1, DECISIONS.md ADR-0011).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator

from app.domain.invariants import check_quantity

Unit = Literal[
    "probability",
    "expectation_value",
    "ratio",
    "usd",
    "seconds",
    "microseconds",
    "count",
]

Provenance = Literal[
    "measured",
    "simulated",
    "heuristic",
    "demo_fixture",
    "planning_estimate",
]


class Quantity(BaseModel):
    value: float
    unit: Unit
    provenance: Provenance
    method_ref: str

    @model_validator(mode="after")
    def _check_range(self) -> "Quantity":
        # Unit-agnostic checks only (I-1 finite + probability, I-2 usd/count/ratio >= 0). A field whose
        # unit is "expectation_value" additionally validates via invariants.check_expectation_value in
        # its owning model, since the estimate-vs-error range split is not decidable from unit alone.
        check_quantity(self.value, self.unit)
        return self
