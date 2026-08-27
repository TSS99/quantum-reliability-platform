"""Deterministic id derivation (DOMAIN_MODEL.md §2, RECON-7).

Same seed + same input => same id, across processes and reloads. No randomness, no clocks.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

_PREFIX = {
    "circuit_fingerprint": "cf",
    "calibration_snapshot_id": "cal",
    "plan_id": "plan",
    "run_id": "run",
    "receipt_id": "rcpt",
    "workload_id": "wl",
}


def _round_floats(obj: Any) -> Any:
    if isinstance(obj, float):
        return round(obj, 12)
    if isinstance(obj, dict):
        return {k: _round_floats(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_round_floats(v) for v in obj]
    return obj


def canonical_json(obj: Any) -> str:
    """Sorted keys, no whitespace, floats rounded to 12dp (repr(round(v, 12)) via json's float repr)."""
    return json.dumps(_round_floats(obj), sort_keys=True, separators=(",", ":"))


def sha(obj: Any) -> str:
    return hashlib.sha256(canonical_json(obj).encode("utf-8")).hexdigest()


def circuit_fingerprint(
    *,
    qubit_count: int,
    depth: int,
    gate_histogram: dict[str, int],
    two_qubit_ratio: float,
    measurement_pattern: Any,
    observable_profile: Any,
    connectivity_class: str,
    parameter_count: int,
) -> str:
    """cf_ + sha(normalized_circuit_characteristics)[:16]."""
    payload = {
        "qubit_count": qubit_count,
        "depth": depth,
        "gate_histogram": dict(sorted(gate_histogram.items())),
        "two_qubit_ratio": round(two_qubit_ratio, 6),
        "measurement_pattern": measurement_pattern,
        "observable_profile": observable_profile,
        "connectivity_class": connectivity_class,
        "parameter_count": parameter_count,
    }
    return f"{_PREFIX['circuit_fingerprint']}_{sha(payload)[:16]}"


def calibration_snapshot_id(*, backend_id: str, captured_at: str, seed: int) -> str:
    """cal_ + sha(backend_id | captured_at | seed)[:16]. `captured_at` must be a stable ISO string."""
    payload = {"backend_id": backend_id, "captured_at": captured_at, "seed": seed}
    return f"{_PREFIX['calibration_snapshot_id']}_{sha(payload)[:16]}"


def plan_id(
    *,
    circuit_fingerprint: str,
    backend_id: str,
    strategy_id: str,
    goal: dict[str, Any],
    seed: int,
) -> str:
    """plan_ + sha(circuit_fingerprint | backend_id | strategy_id | sha(goal) | seed)[:16]."""
    payload = {
        "circuit_fingerprint": circuit_fingerprint,
        "backend_id": backend_id,
        "strategy_id": strategy_id,
        "goal_hash": sha(goal),
        "seed": seed,
    }
    return f"{_PREFIX['plan_id']}_{sha(payload)[:16]}"


def run_id(*, plan_id: str, shots: int, seed: int) -> str:
    """run_ + sha(plan_id | shots | seed)[:16]."""
    payload = {"plan_id": plan_id, "shots": shots, "seed": seed}
    return f"{_PREFIX['run_id']}_{sha(payload)[:16]}"


def receipt_id(*, run_id: str) -> str:
    """rcpt_ sharing the run_id's suffix (receipt <-> run is 1:1)."""
    suffix = run_id.split("_", 1)[1]
    return f"{_PREFIX['receipt_id']}_{suffix}"


def workload_id(*, slug: str | None = None, source_text: str | None = None, seed: int = 0) -> str:
    """The example slug as-is, or wl_ + sha(source_text | seed)[:16] for pasted/uploaded workloads."""
    if slug is not None:
        return slug
    if source_text is None:
        raise ValueError("workload_id requires either slug or source_text")
    payload = {"source_text": source_text, "seed": seed}
    return f"{_PREFIX['workload_id']}_{sha(payload)[:16]}"
