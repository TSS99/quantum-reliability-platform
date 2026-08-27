"""Statistical vs strategy confidence — always two fields, never combined (DOMAIN_MODEL.md §1.2, RECON-9)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, field_validator

from app.domain.invariants import check_probability_confidence


class StatisticalConfidence(BaseModel):
    """Frequentist coverage on the sampling / shot-noise part ONLY."""

    level: float
    interval: tuple[float, float]
    method: Literal["wilson", "normal", "bootstrap"]
    insufficient_statistics: bool

    @field_validator("level")
    @classmethod
    def _check_level(cls, v: float) -> float:
        check_probability_confidence(v)
        return v


class StrategyConfidence(BaseModel):
    """The model's heuristic confidence in its own estimate. Not a coverage probability."""

    value: float
    basis: str

    @field_validator("value")
    @classmethod
    def _check_value(cls, v: float) -> float:
        check_probability_confidence(v)
        return v
