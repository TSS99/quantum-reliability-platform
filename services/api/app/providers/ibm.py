"""IBM Quantum adapter — REAL calibration data, read-only (Tier 1).

This is the first adapter that returns measured values rather than fixtures. It reads a backend's
published properties (T1, T2, gate and readout error, coupling map) which IBM exposes **without
running a job** — so it costs nothing and needs no queue.

Boundaries this module keeps:

* **Credentials are server-side only.** The token is read from `QRP_IBM_TOKEN` (or the saved
  qiskit-ibm-runtime account). It is never returned by any endpoint and never reaches the browser
  (MISSION §44, §13).
* **`measured` means measured.** Values that came off a real device are tagged `provenance:
  "measured"` with the device's own `last_update_date`. Nothing here is synthesised — if a property
  is absent, it is `None`, never a filled-in guess (§20).
* **Absence is not failure.** With no token, or without the optional dependency, `available()` is
  False and callers fall back to the DemoProvider. The product keeps working, honestly labelled.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

TOKEN_ENV = "QRP_IBM_TOKEN"
CHANNEL_ENV = "QRP_IBM_CHANNEL"  # "ibm_quantum_platform" (default) | "ibm_cloud"
INSTANCE_ENV = "QRP_IBM_INSTANCE"


class IBMUnavailable(RuntimeError):
    """Raised with a reason the API can surface verbatim — never a bare failure."""

    def __init__(self, reason: str, *, code: str) -> None:
        super().__init__(reason)
        self.code = code


def _service() -> Any:
    """Build a QiskitRuntimeService, or explain precisely why we cannot."""
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService
    except ImportError as exc:
        raise IBMUnavailable(
            "qiskit-ibm-runtime is not installed: pip install '.[quantum]'",
            code="DEPENDENCY_MISSING",
        ) from exc

    token = os.environ.get(TOKEN_ENV)
    kwargs: dict[str, Any] = {}
    if token:
        kwargs["token"] = token
        kwargs["channel"] = os.environ.get(CHANNEL_ENV, "ibm_quantum_platform")
        if os.environ.get(INSTANCE_ENV):
            kwargs["instance"] = os.environ[INSTANCE_ENV]
    try:
        # With no token we still try the saved account; that is the documented local-dev path.
        return QiskitRuntimeService(**kwargs)
    except Exception as exc:
        raise IBMUnavailable(
            f"no usable IBM Quantum credentials (set {TOKEN_ENV}): {exc}",
            code="CREDENTIALS_MISSING",
        ) from exc


@dataclass(frozen=True)
class IBMProvider:
    """Read-only adapter over IBM Quantum backend properties."""

    provider_id: str = "ibm"
    adapter_status: str = "integration_implemented"

    # ------------------------------------------------------------------ status

    def available(self) -> bool:
        try:
            _service()
            return True
        except IBMUnavailable:
            return False

    def status(self) -> dict:
        """Why the adapter is or is not usable — surfaced to the UI, never a silent failure."""
        try:
            _service()
            return {"provider_id": self.provider_id, "available": True, "reason": None}
        except IBMUnavailable as exc:
            return {"provider_id": self.provider_id, "available": False,
                    "reason": str(exc), "code": exc.code}

    # --------------------------------------------------------------- backends

    def list_backends(self, *, operational_only: bool = True) -> list[dict]:
        service = _service()
        out: list[dict] = []
        for b in service.backends(operational=operational_only or None):
            try:
                out.append(self._summarise(b))
            except Exception:
                # One malformed backend must not sink the whole listing.
                continue
        return out

    def _summarise(self, backend: Any) -> dict:
        cfg = getattr(backend, "configuration", lambda: None)()
        return {
            "backend_id": backend.name,
            "display_name": backend.name,
            "provider_id": self.provider_id,
            "adapter_status": self.adapter_status,
            "technology": "superconducting",
            "qubit_count": getattr(backend, "num_qubits", None),
            "topology_class": getattr(cfg, "processor_type", {}).get("family")
            if isinstance(getattr(cfg, "processor_type", None), dict) else None,
            "basis_gates": list(getattr(cfg, "basis_gates", []) or []),
            "supports_dynamic_circuits": bool(getattr(cfg, "supports_dynamic_circuits", False)),
            "simulator": bool(getattr(cfg, "simulator", False)),
            "provenance": "measured",
        }

    def get_backend_profile(self, backend_id: str) -> dict:
        service = _service()
        backend = service.backend(backend_id)
        summary = self._summarise(backend)
        cal = self.get_calibration(backend_id, _backend=backend)
        summary["median_two_qubit_error_rate"] = cal["median_two_qubit_error_rate"]
        summary["median_readout_error_rate"] = cal["median_readout_error_rate"]
        summary["median_t1_us"] = cal["median_t1_us"]
        summary["median_t2_us"] = cal["median_t2_us"]
        summary["last_update_date"] = cal["last_update_date"]
        return summary

    # ------------------------------------------------------------ calibration

    def get_calibration(self, backend_id: str, *, _backend: Any = None) -> dict:
        """Per-qubit and per-coupler properties as the device last reported them."""
        backend = _backend if _backend is not None else _service().backend(backend_id)
        props = backend.properties()
        if props is None:
            raise IBMUnavailable(
                f"backend {backend_id!r} publishes no properties (likely a simulator)",
                code="NO_PROPERTIES",
            )

        def _safe(fn, *args):
            try:
                return fn(*args)
            except Exception:
                return None  # absent property -> null, never a substituted number

        qubits = []
        for q in range(backend.num_qubits):
            t1 = _safe(props.t1, q)
            t2 = _safe(props.t2, q)
            qubits.append({
                "qubit": q,
                "t1_us": round(t1 * 1e6, 3) if t1 else None,
                "t2_us": round(t2 * 1e6, 3) if t2 else None,
                "readout_error_rate": _safe(props.readout_error, q),
            })

        couplers = []
        cmap = getattr(backend, "coupling_map", None)
        if cmap is not None:
            for pair in list(cmap):
                a, b = int(pair[0]), int(pair[1])
                err = _safe(props.gate_error, "cx", [a, b]) or _safe(props.gate_error, "ecr", [a, b])
                couplers.append({"control": a, "target": b, "two_qubit_error_rate": err})

        def _median(vals: list[float | None]) -> float | None:
            xs = sorted(v for v in vals if v is not None)
            if not xs:
                return None
            mid = len(xs) // 2
            return xs[mid] if len(xs) % 2 else (xs[mid - 1] + xs[mid]) / 2

        last = getattr(props, "last_update_date", None)
        return {
            "backend_id": backend_id,
            "provider_id": self.provider_id,
            "provenance": "measured",
            "last_update_date": last.isoformat() if last else None,
            "qubits": qubits,
            "couplers": couplers,
            "median_t1_us": _median([q["t1_us"] for q in qubits]),
            "median_t2_us": _median([q["t2_us"] for q in qubits]),
            "median_readout_error_rate": _median([q["readout_error_rate"] for q in qubits]),
            "median_two_qubit_error_rate": _median([c["two_qubit_error_rate"] for c in couplers]),
        }


provider = IBMProvider()
