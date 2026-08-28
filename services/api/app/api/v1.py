"""The v1 REST surface (MISSION §50, API_CONTRACT.md).

Every endpoint here has a real consumer and is backed by a REAL engine — the QEM catalog, the
two-stage optimizer, the Stim/PyMatching QEC simulator, or the DemoProvider. Endpoints whose engine
does not exist yet are deliberately absent rather than stubbed (§50: no endpoint without a consumer;
§71: no faked capability). Wire format is snake_case (RECON-2).
"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.circuits.qasm import CircuitParseError, parse_qasm
from app.optimization import Candidate, optimize
from app.providers.demo import PLANNED_ADAPTERS, provider
from app.providers.ibm import IBMUnavailable
from app.providers.ibm import provider as ibm
from app.qec.config import SimulationConfig
from app.qec.errors import QecConfigError
from app.schemas.goal import ReliabilityGoal

router = APIRouter(prefix="/api/v1")


# ----------------------------------------------------------------------- backends


@router.get("/backends", tags=["hardware"])
def list_backends() -> dict:
    """Demo backends plus the adapters that are declared-but-not-implemented."""
    return {"backends": provider.list_backends(), "planned_adapters": list(PLANNED_ADAPTERS)}


@router.get("/backends/{backend_id}", tags=["hardware"])
def get_backend(backend_id: str) -> dict:
    profile = provider.get_backend_profile(backend_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"unknown backend {backend_id!r}")
    return profile


@router.get("/backends/{backend_id}/calibration", tags=["hardware"])
def get_calibration(backend_id: str) -> dict:
    cal = provider.get_calibration(backend_id)
    if cal is None:
        raise HTTPException(status_code=404, detail=f"unknown backend {backend_id!r}")
    return cal


# ------------------------------------------------------------------ circuit analyze


class CircuitAnalyzeRequest(BaseModel):
    qubit_count: int = Field(ge=1)
    depth: int = Field(ge=0)
    two_qubit_gate_count: int = Field(ge=0)
    single_qubit_gate_count: int = Field(ge=0)
    measurement_count: int = Field(ge=0)
    has_mid_circuit_measurement: bool = False
    has_classical_feedback: bool = False


@router.post("/circuits/analyze", tags=["circuits"])
def analyze_circuit(req: CircuitAnalyzeRequest) -> dict:
    """Derived circuit features the optimizer and the compatibility matrix consume."""
    total_gates = req.two_qubit_gate_count + req.single_qubit_gate_count
    two_q_ratio = (req.two_qubit_gate_count / total_gates) if total_gates else 0.0
    # Idle exposure proxy: depth not covered by this qubit's own gates, normalised.
    idle = max(0.0, 1.0 - (total_gates / max(req.depth * req.qubit_count, 1)))
    return {
        "qubit_count": req.qubit_count,
        "depth": req.depth,
        "two_qubit_gate_count": req.two_qubit_gate_count,
        "single_qubit_gate_count": req.single_qubit_gate_count,
        "measurement_count": req.measurement_count,
        "two_qubit_ratio": round(two_q_ratio, 4),
        "idle_exposure": round(idle, 4),
        "has_mid_circuit_measurement": req.has_mid_circuit_measurement,
        "has_classical_feedback": req.has_classical_feedback,
        "provenance": "heuristic",
        "method_ref": "docs/QEM_METHODS.md#circuit-profile",
    }


# --------------------------------------------------------------- optimize / preflight


class CandidateIn(BaseModel):
    candidate_id: str
    backend_id: str
    strategy_id: str
    estimated_cost_usd: float = Field(ge=0)
    rmse: float = Field(ge=0)
    estimated_qpu_seconds: float = Field(ge=0)
    qubit_overhead: float = 0.0
    decoder_latency_s: float = 0.0


class OptimizeRequest(BaseModel):
    goal: ReliabilityGoal
    candidates: list[CandidateIn] = Field(min_length=1)


def _run(req: OptimizeRequest):
    return optimize([Candidate(**c.model_dump()) for c in req.candidates], req.goal)


def _plan_json(s) -> dict:
    return {
        "candidate_id": s.candidate.candidate_id,
        "backend_id": s.candidate.backend_id,
        "strategy_id": s.candidate.strategy_id,
        "feasibility": s.feasibility,
        "estimated_cost_usd": s.candidate.estimated_cost_usd,
        "rmse": s.candidate.rmse,
        "estimated_qpu_seconds": s.candidate.estimated_qpu_seconds,
        "score": None if s.score is None else s.score.model_dump(),
        "findings": [f.model_dump() for f in s.findings],
        "tie_break_applied": s.tie_break_applied,
    }


@router.post("/strategies/optimize", tags=["optimizer"])
def optimize_strategies(req: OptimizeRequest) -> dict:
    """Two-stage optimizer: hard-constraint pre-filter, then a fixed-range weighted score."""
    res = _run(req)
    return {
        "recommended_candidate_id": res.recommended_id,
        "weights": res.weights.model_dump(),
        "explanation": res.explanation,
        "ranked": [_plan_json(s) for s in res.ranked],
        "infeasible": [_plan_json(s) for s in res.infeasible],
    }


@router.post("/preflight", tags=["optimizer"])
def preflight(req: OptimizeRequest) -> dict:
    """RUN / RUN_WITH_WARNING / DO_NOT_RUN / INSUFFICIENT_DATA, computed from the findings."""
    res = _run(req)
    return {
        "status": res.preflight_status,
        "summary": res.preflight_summary,
        "recommended_candidate_id": res.recommended_id,
    }


# ------------------------------------------------------------------------- qec


class QecSimulateRequest(BaseModel):
    code: Literal["repetition", "rotated_surface"]
    distance: int
    noise_model: Literal["code_capacity", "phenomenological", "circuit_level"]
    p: float = Field(gt=0, lt=1)
    decoder_id: str = "mwpm_pymatching"
    rounds: int | None = None
    max_shots: int = Field(default=20_000, ge=1, le=200_000)
    max_errors: int = Field(default=1_000, ge=1)
    seed: int = 0


@router.post("/qec/simulate", tags=["qec"])
def qec_simulate(req: QecSimulateRequest) -> dict:
    """Runs a real Stim + PyMatching simulation. Results are `simulated`, never measured."""
    try:
        from app.qec.simulate import run_simulation  # imported lazily: heavy scientific deps
    except ImportError as exc:  # pragma: no cover - depends on the local environment
        raise HTTPException(
            status_code=503,
            detail="QEC simulation requires stim and pymatching: pip install stim pymatching",
        ) from exc
    try:
        return run_simulation(SimulationConfig(**req.model_dump()))
    except QecConfigError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


# ------------------------------------------------------- circuits (Tier 2: your own circuit)


class QasmRequest(BaseModel):
    """A user-supplied OpenQASM 2 or 3 circuit. Limits are enforced by the parser, not here."""

    qasm: str = Field(min_length=1)


@router.post("/circuits/parse", tags=["circuits"])
def parse_circuit(req: QasmRequest) -> dict:
    """Parse a real circuit into the profile the optimizer consumes.

    Rejects oversized or unsupported input with a structured reason code — the caller can map it
    straight onto the shared preflight vocabulary.
    """
    try:
        return parse_qasm(req.qasm).to_dict()
    except CircuitParseError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": exc.code, "message": str(exc), **exc.detail},
        ) from exc


# ------------------------------------------------ real hardware (Tier 1: read-only calibration)


@router.get("/providers", tags=["hardware"])
def providers() -> dict:
    """Which adapters can actually serve data right now, and why not when they cannot."""
    return {
        "providers": [
            {"provider_id": "demo", "available": True, "adapter_status": "demo_support",
             "reason": None},
            ibm.status() | {"adapter_status": ibm.adapter_status},
        ],
        "planned_adapters": list(PLANNED_ADAPTERS),
    }


@router.get("/providers/ibm/backends", tags=["hardware"])
def ibm_backends() -> dict:
    """Live IBM Quantum backends. 503 (never a fabricated list) when unavailable."""
    try:
        return {"backends": ibm.list_backends(), "provenance": "measured"}
    except IBMUnavailable as exc:
        raise HTTPException(status_code=503, detail={"code": exc.code, "message": str(exc)}) from exc


@router.get("/providers/ibm/backends/{backend_id}/calibration", tags=["hardware"])
def ibm_calibration(backend_id: str) -> dict:
    """Real measured calibration: T1/T2, readout error, per-coupler two-qubit error."""
    try:
        return ibm.get_calibration(backend_id)
    except IBMUnavailable as exc:
        raise HTTPException(status_code=503, detail={"code": exc.code, "message": str(exc)}) from exc
