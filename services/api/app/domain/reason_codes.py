"""The ONE shared reason-code enum + status precedence (API_CONTRACT.md §3, RECON-21).

Co-owned with the Optimizer; used by both Preflight and the Optimizer's Stage-A feasibility check.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from app.schemas.quantity import Quantity

ReasonCode = Literal[
    "COST_EXCEEDED",
    "TARGET_ERROR_UNLIKELY",
    "CALIBRATION_STALE",
    "MITIGATION_OVERHEAD_TOO_HIGH",
    "UNSUPPORTED_CIRCUIT_FEATURE",
    "QEC_CAPABILITY_MISSING",
    "INSUFFICIENT_CALIBRATION_DATA",
]

Severity = Literal["blocking", "warning", "insufficient_data"]

PreflightStatus = Literal["RUN", "RUN_WITH_WARNING", "DO_NOT_RUN", "INSUFFICIENT_DATA"]


class Finding(BaseModel):
    code: ReasonCode
    severity: Severity
    subject: Literal["circuit", "backend", "calibration", "strategy", "goal", "plan"]
    subject_id: str | None
    message: str
    evidence: dict[str, Quantity | float | int | str]


def status_from(findings: list[Finding]) -> PreflightStatus:
    """Status precedence, computed — never hand-set: INSUFFICIENT_DATA > DO_NOT_RUN > RUN_WITH_WARNING > RUN."""
    if any(f.severity == "insufficient_data" for f in findings):
        return "INSUFFICIENT_DATA"
    if any(f.severity == "blocking" for f in findings):
        return "DO_NOT_RUN"
    if any(f.severity == "warning" for f in findings):
        return "RUN_WITH_WARNING"
    return "RUN"
