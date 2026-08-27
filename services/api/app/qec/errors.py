"""Structured rejection for impossible QEC configurations (QEC_METHODS.md §8.8, §43).

One reason code is used for every QEC config rejection: `QEC_CAPABILITY_MISSING`. The RECON-21 enum
in `app.domain.reason_codes` is co-owned with the Optimizer, so this module reuses a member rather
than inventing one; "the requested QEC configuration is not a capability QRP has" is literally what
every rejection here means. `evidence` names the offending field and the allowed values so the caller
can offer real choices instead of guessing.
"""
from __future__ import annotations

from app.domain.reason_codes import ReasonCode


class QecConfigError(ValueError):
    """Raised for a configuration QRP cannot simulate. Never returns a number (§27, §71)."""

    def __init__(self, message: str, *, field: str, allowed: object = None) -> None:
        super().__init__(message)
        self.code: ReasonCode = "QEC_CAPABILITY_MISSING"
        self.message = message
        self.field = field
        self.allowed = allowed

    def to_payload(self) -> dict[str, object]:
        return {
            "code": self.code,
            "message": self.message,
            "evidence": {"field": self.field, "allowed": self.allowed},
        }
