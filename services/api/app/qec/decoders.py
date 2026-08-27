"""Decoder registry (QEC_METHODS.md §5, §27, §71).

Phase-6 scope narrows QEC_METHODS.md §5: `mwpm_pymatching` is the ONLY real decoder. Repetition-code
`majority_vote`, which §5 listed as an optional second real decoder, is registered here as
NOT_IMPLEMENTED rather than half-built — a declared row with null metrics is honest, a hastily
reconstructed one is not.

Hard rule: a NOT_IMPLEMENTED decoder returns `null` for EVERY metric. Never an estimate, never an
interpolation, never a literature value, never a placeholder.
"""
from __future__ import annotations

from typing import Literal

DecoderStatus = Literal["REAL", "NOT_IMPLEMENTED"]

# Every metric field a REAL row carries. A NOT_IMPLEMENTED row carries all of them as None.
METRIC_FIELDS: tuple[str, ...] = (
    "shots",
    "logical_errors",
    "logical_error_rate",
    "ler_ci_low",
    "ler_ci_high",
    "logical_error_rate_per_round",
    "lerpr_ci_low",
    "lerpr_ci_high",
    "detection_event_rate",
    "decoder_seconds_per_shot",
)

DECODERS: dict[str, dict[str, object]] = {
    "mwpm_pymatching": {
        "status": "REAL",
        "codes": ("repetition", "rotated_surface"),
        "reason": None,
    },
    "majority_vote": {
        "status": "NOT_IMPLEMENTED",
        "codes": ("repetition",),
        "reason": "Descoped in Phase 6; MWPM is the only decoder QRP actually runs in V1.",
    },
    "bp": {
        "status": "NOT_IMPLEMENTED",
        "codes": (),
        "reason": "Belief propagation is a declared reference entry only; not implemented in V1.",
    },
    "bp_osd": {
        "status": "NOT_IMPLEMENTED",
        "codes": (),
        "reason": "BP+OSD is a declared reference entry only; not implemented in V1.",
    },
    "union_find": {
        "status": "NOT_IMPLEMENTED",
        "codes": (),
        "reason": "Union-Find is a declared reference entry only; not implemented in V1.",
    },
    "gpu_decoder": {
        "status": "NOT_IMPLEMENTED",
        "codes": (),
        "reason": "No GPU decoding path exists in V1; no latency or throughput is claimed.",
    },
    "custom": {
        "status": "NOT_IMPLEMENTED",
        "codes": (),
        "reason": "Plugin seam only; no decoder is registered against it in V1.",
    },
}

REAL_DECODERS: tuple[str, ...] = tuple(
    d for d, spec in DECODERS.items() if spec["status"] == "REAL"
)


def status_of(decoder_id: str) -> DecoderStatus:
    return DECODERS[decoder_id]["status"]  # type: ignore[return-value]


def not_implemented_row(decoder_id: str, **config_fields: object) -> dict[str, object]:
    """A declared-but-not-run row: configuration is echoed, every metric is null (§27, §71)."""
    spec = DECODERS[decoder_id]
    if spec["status"] == "REAL":
        raise ValueError(f"{decoder_id} is REAL; run it instead of declaring it")
    row: dict[str, object] = dict(config_fields)
    row["decoder_id"] = decoder_id
    row["decoder_status"] = "NOT_IMPLEMENTED"
    row["not_implemented_reason"] = spec["reason"]
    row["insufficient_statistics"] = None
    row.update({field: None for field in METRIC_FIELDS})
    return row
