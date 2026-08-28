"""The v1 REST surface: real engines behind real endpoints (MISSION §50)."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _goal(max_cost: float = 80.0, target_error: float = 0.02) -> dict:
    q = lambda v, u: {"value": v, "unit": u, "provenance": "demo_fixture", "method_ref": "TEST"}  # noqa: E731
    return {
        "target_error": q(target_error, "expectation_value"),
        "confidence_target": 0.95,
        "max_cost_usd": q(max_cost, "usd"),
        "max_runtime_seconds": q(600.0, "seconds"),
        "priority": "balanced",
    }


def _cand(cid: str, cost: float, rmse: float) -> dict:
    return {
        "candidate_id": cid, "backend_id": "demo_grid_16", "strategy_id": cid,
        "estimated_cost_usd": cost, "rmse": rmse, "estimated_qpu_seconds": 12.0,
    }


def test_backends_list_includes_demo_and_declares_planned_adapters():
    r = client.get("/api/v1/backends")
    assert r.status_code == 200
    body = r.json()
    assert len(body["backends"]) == 3
    # planned adapters are DECLARED, never presented as working (§13/§71)
    assert all(a["adapter_status"] == "adapter_planned" for a in body["planned_adapters"])


def test_backend_detail_and_404():
    assert client.get("/api/v1/backends/demo_grid_16").status_code == 200
    assert client.get("/api/v1/backends/nope").status_code == 404


def test_unknown_field_is_null_not_zero():
    """§20: a value the demo device cannot report is null — reporting 0 would be a lie."""
    body = client.get("/api/v1/backends/demo_grid_16").json()
    assert body["quantum_volume"] is None


def test_calibration_history_is_deterministic():
    a = client.get("/api/v1/backends/demo_ring_12/calibration").json()
    b = client.get("/api/v1/backends/demo_ring_12/calibration").json()
    assert a == b  # same input -> same output (§33)
    assert len(a["history"]) == 14
    assert a["validity"] == "stale"


def test_circuit_analyze_derives_features():
    r = client.post("/api/v1/circuits/analyze", json={
        "qubit_count": 4, "depth": 12, "two_qubit_gate_count": 6,
        "single_qubit_gate_count": 14, "measurement_count": 4,
    })
    assert r.status_code == 200
    body = r.json()
    assert 0.0 <= body["two_qubit_ratio"] <= 1.0
    assert body["provenance"] == "heuristic"


def test_optimize_ranks_and_excludes_over_budget():
    r = client.post("/api/v1/strategies/optimize", json={
        "goal": _goal(max_cost=80),
        "candidates": [_cand("cheap", 5, 0.05), _cand("over", 500, 0.001)],
    })
    assert r.status_code == 200
    body = r.json()
    assert body["recommended_candidate_id"] == "cheap"
    # a violated hard cap can never be rescued by a weight (RECON-19)
    assert [p["candidate_id"] for p in body["infeasible"]] == ["over"]


def test_preflight_status_precedence():
    over = client.post("/api/v1/preflight", json={
        "goal": _goal(max_cost=10), "candidates": [_cand("a", 500, 0.001)],
    }).json()
    assert over["status"] == "DO_NOT_RUN"

    missed = client.post("/api/v1/preflight", json={
        "goal": _goal(target_error=0.01), "candidates": [_cand("a", 5, 0.2)],
    }).json()
    assert missed["status"] == "RUN_WITH_WARNING"


def test_qec_simulate_rejects_an_impossible_config():
    r = client.post("/api/v1/qec/simulate", json={
        "code": "rotated_surface", "distance": 4, "noise_model": "circuit_level", "p": 0.001,
    })
    # even-distance surface codes are rejected by the engine, not silently accepted
    assert r.status_code in (422, 503)
