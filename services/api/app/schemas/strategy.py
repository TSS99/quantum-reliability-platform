"""`MitigationStrategy` — a candidate technique, with its compatibility verdict (DOMAIN_MODEL.md §3.6)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator

from app.domain.reason_codes import ReasonCode


class Compatibility(BaseModel):
    """Three-valued, from the machine-readable matrix owned by QEM Sci (RECON-13)."""

    verdict: Literal["compatible", "conditional", "incompatible"]
    conditions: list[str] = []  # populated iff verdict == "conditional"
    reason_codes: list[ReasonCode] = []  # populated iff verdict == "incompatible"

    @model_validator(mode="after")
    def _check_population(self) -> "Compatibility":
        if self.verdict != "conditional" and self.conditions:
            raise ValueError("conditions must be empty unless verdict == 'conditional'")
        if self.verdict != "incompatible" and self.reason_codes:
            raise ValueError("reason_codes must be empty unless verdict == 'incompatible'")
        return self


class MitigationStrategy(BaseModel):
    strategy_id: str  # stable slug: "raw", "readout_m3", "dd_readout", "zne_folding", "dd_zne", "pec_planning"
    display_name: str
    family: Literal["none", "readout", "dynamical_decoupling", "zne", "pec"]
    maturity: Literal["implemented", "experimental", "planned"]
    executable: bool  # PEC is False in V1 — calculator only (RECON-13)
    twirling_enabled: bool = False  # a MODIFIER, never a standalone strategy (RECON-13)
    parameters: dict[str, float | int | str | bool]  # family-specific; see QEM_METHODS.md
    compatibility: Compatibility
    method_ref: str
