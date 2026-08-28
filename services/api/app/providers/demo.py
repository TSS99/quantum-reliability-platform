"""DemoProvider — seeded, deterministic backend profiles (MISSION §13).

The prototype ships no live provider integration: real adapters are backend-only and are declared
`planned` rather than faked (§13, §71). Every value here is `demo_fixture` provenance; fields a real
device would report but we cannot know are `None`, never zero (§20).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

AdapterStatus = Literal["demo_support", "adapter_planned", "integration_implemented"]


@dataclass(frozen=True)
class DemoBackend:
    backend_id: str
    display_name: str
    provider_id: str
    adapter_status: AdapterStatus
    technology: str
    topology_class: str
    qubit_count: int
    median_two_qubit_error_rate: float
    median_readout_error_rate: float
    median_t1_us: float
    median_t2_us: float
    cost_per_qpu_second_usd: float
    supports_dynamic_circuits: bool
    supports_delay_scheduling: bool
    quantum_volume: int | None = None  # unknown for demo devices — null, not 0
    basis_gates: tuple[str, ...] = ("rz", "sx", "x", "cx")


BACKENDS: tuple[DemoBackend, ...] = (
    DemoBackend(
        backend_id="demo_hexlat_27", display_name="Demo Hex-Lattice 27", provider_id="demo",
        adapter_status="demo_support", technology="superconducting", topology_class="heavy-hex-like (synthetic)",
        qubit_count=27, median_two_qubit_error_rate=8.2e-3, median_readout_error_rate=2.1e-2,
        median_t1_us=118.0, median_t2_us=96.0, cost_per_qpu_second_usd=0.32,
        supports_dynamic_circuits=True, supports_delay_scheduling=True,
    ),
    DemoBackend(
        backend_id="demo_grid_16", display_name="Demo Square-Grid 16", provider_id="demo",
        adapter_status="demo_support", technology="superconducting", topology_class="square grid (synthetic)",
        qubit_count=16, median_two_qubit_error_rate=1.3e-2, median_readout_error_rate=3.0e-2,
        median_t1_us=92.0, median_t2_us=71.0, cost_per_qpu_second_usd=0.21,
        supports_dynamic_circuits=False, supports_delay_scheduling=True,
    ),
    DemoBackend(
        backend_id="demo_ring_12", display_name="Demo Ring 12", provider_id="demo",
        adapter_status="demo_support", technology="ion-trap", topology_class="closed ring (synthetic)",
        qubit_count=12, median_two_qubit_error_rate=5.7e-3, median_readout_error_rate=1.6e-2,
        median_t1_us=1400.0, median_t2_us=900.0, cost_per_qpu_second_usd=0.95,
        supports_dynamic_circuits=False, supports_delay_scheduling=False,
    ),
)

# Adapters that are DECLARED, never faked (§13/§71).
PLANNED_ADAPTERS: tuple[dict[str, str], ...] = (
    {"provider_id": "ibm", "technology": "superconducting", "adapter_status": "adapter_planned"},
    {"provider_id": "iqm", "technology": "superconducting", "adapter_status": "adapter_planned"},
    {"provider_id": "rigetti", "technology": "superconducting", "adapter_status": "adapter_planned"},
    {"provider_id": "ionq", "technology": "ion-trap", "adapter_status": "adapter_planned"},
    {"provider_id": "quantinuum", "technology": "ion-trap", "adapter_status": "adapter_planned"},
)

# Calibration drift per backend: (age_hours, validity, multiplicative drift across the history).
_DRIFT: dict[str, tuple[float, str, float]] = {
    "demo_hexlat_27": (3.2, "stable", 1.06),
    "demo_grid_16": (14.5, "watch", 1.34),
    "demo_ring_12": (41.7, "stale", 1.81),
}

HISTORY_POINTS = 14


@dataclass(frozen=True)
class DemoProvider:
    """The only adapter the prototype can actually execute against."""

    provider_id: str = "demo"
    adapter_status: AdapterStatus = "demo_support"
    seed: int = 20260827
    _backends: tuple[DemoBackend, ...] = field(default=BACKENDS)

    def list_backends(self) -> list[dict]:
        return [asdict(b) for b in self._backends]

    def get_backend_profile(self, backend_id: str) -> dict | None:
        for b in self._backends:
            if b.backend_id == backend_id:
                return asdict(b)
        return None

    def get_calibration(self, backend_id: str) -> dict | None:
        """A deterministic 14-point history ending 'now'. Same input → same output (§33)."""
        profile = self.get_backend_profile(backend_id)
        if profile is None:
            return None
        age_hours, validity, drift = _DRIFT.get(backend_id, (6.0, "stable", 1.05))
        history = []
        for i in range(HISTORY_POINTS):
            t = i / (HISTORY_POINTS - 1)
            growth = 1 + (drift - 1) * t
            history.append({
                "index": i,
                "hours_before_now": round(age_hours + (HISTORY_POINTS - 1 - i) * 12, 2),
                "two_qubit_error_rate": float(f"{profile['median_two_qubit_error_rate'] * growth:.4g}"),
                "readout_error_rate": float(f"{profile['median_readout_error_rate'] * growth:.4g}"),
                "t1_us": float(f"{profile['median_t1_us'] / growth:.4g}"),
                "t2_us": float(f"{profile['median_t2_us'] / growth:.4g}"),
            })
        return {
            "backend_id": backend_id,
            "age_hours": age_hours,
            "validity": validity,
            "drift_factor": drift,
            "provenance": "demo_fixture",
            "history": history,
        }

    def estimate_cost(self, backend_id: str, shots: int, qpu_seconds: float) -> dict | None:
        profile = self.get_backend_profile(backend_id)
        if profile is None:
            return None
        cost = profile["cost_per_qpu_second_usd"] * qpu_seconds
        return {
            "backend_id": backend_id,
            "shots": shots,
            "estimated_qpu_seconds": qpu_seconds,
            "estimated_cost_usd": round(cost, 4),
            "provenance": "heuristic",
            "pricing_model_ref": "docs/API_CONTRACT.md#cost-model",
        }


provider = DemoProvider()
