"""`HardwareProfile` — a backend, honestly described (DOMAIN_MODEL.md §3.3)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator

from app.domain.invariants import check_field_unit_suffixes
from app.schemas.quantity import Quantity


class QECCapability(BaseModel):
    """§20 future-QEC fields. Every one is nullable: null renders 'Not provided', never 0."""

    measurement_latency_us: Quantity | None
    reset_latency_us: Quantity | None
    feed_forward_latency_us: Quantity | None
    leakage_rate: Quantity | None  # unit "probability"
    decoder_latency_budget_us: Quantity | None
    syndrome_cycle_estimate_us: Quantity | None
    classical_bandwidth_ref: str | None

    @model_validator(mode="after")
    def _check_units(self) -> "QECCapability":
        check_field_unit_suffixes(
            {
                "measurement_latency_us": self.measurement_latency_us,
                "reset_latency_us": self.reset_latency_us,
                "feed_forward_latency_us": self.feed_forward_latency_us,
                "decoder_latency_budget_us": self.decoder_latency_budget_us,
                "syndrome_cycle_estimate_us": self.syndrome_cycle_estimate_us,
            }
        )
        return self


class HardwareProfile(BaseModel):
    backend_id: str
    provider_id: str
    display_name: str
    technology: Literal["superconducting", "trapped_ion", "neutral_atom", "photonic", "simulator"]
    adapter_status: Literal["implemented", "planned"]  # §13 — never claim unimplemented support
    qubit_count: int
    coupling_map: list[tuple[int, int]]
    connectivity_class: Literal["linear", "heavy_hex", "grid", "all_to_all", "irregular"]
    basis_gates: list[str]
    supports_dynamic_circuits: bool | None
    supports_mid_circuit_measurement: bool | None
    supports_delay_scheduling: bool | None  # DD prerequisite
    supports_reset: bool | None
    latest_calibration_snapshot_id: str | None
    qec_capability: QECCapability
    pricing_ref: str  # key into the §52 cost config
