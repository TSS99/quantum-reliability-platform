"""Tier 1 (real hardware, read-only) and Tier 2 (bring your own circuit)."""
from fastapi.testclient import TestClient

from app.circuits.qasm import MAX_SOURCE_BYTES, CircuitParseError, parse_qasm
from app.main import app

client = TestClient(app)

BELL = """OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];
measure q -> c;
"""

GHZ4 = """OPENQASM 2.0;
include "qelib1.inc";
qreg q[4];
creg c[4];
h q[0];
cx q[0],q[1];
cx q[1],q[2];
cx q[2],q[3];
measure q -> c;
"""


# ------------------------------------------------------------------ Tier 2


def test_parses_a_real_bell_circuit():
    p = parse_qasm(BELL).to_dict()
    assert p["qubit_count"] == 2
    assert p["single_qubit_gate_count"] == 1
    assert p["two_qubit_gate_count"] == 1
    assert p["measurement_count"] == 2
    assert p["two_qubit_ratio"] == 0.5


def test_profile_scales_with_the_circuit():
    """A bigger entangling circuit must actually move the features the optimizer reads."""
    bell, ghz = parse_qasm(BELL).to_dict(), parse_qasm(GHZ4).to_dict()
    assert ghz["qubit_count"] > bell["qubit_count"]
    assert ghz["two_qubit_gate_count"] > bell["two_qubit_gate_count"]


def test_endpoint_parses_and_reports_provenance():
    r = client.post("/api/v1/circuits/parse", json={"qasm": BELL})
    assert r.status_code == 200
    body = r.json()
    # measured FROM THE SUBMITTED CIRCUIT — a real property of the input, not a hardware claim
    assert body["provenance"] == "measured"
    assert body["parser"] in ("qiskit", "fallback")


def test_oversized_payload_is_refused_before_parsing():
    huge = "OPENQASM 2.0;\nqreg q[2];\n" + ("h q[0];\n" * 200_000)
    assert len(huge.encode()) > MAX_SOURCE_BYTES
    r = client.post("/api/v1/circuits/parse", json={"qasm": huge})
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "PAYLOAD_TOO_LARGE"


def test_too_many_qubits_is_refused():
    r = client.post("/api/v1/circuits/parse", json={
        "qasm": "OPENQASM 2.0;\ninclude \"qelib1.inc\";\nqreg q[512];\nh q[0];\n"
    })
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "UNSUPPORTED_CIRCUIT_FEATURE"


def test_garbage_is_rejected_not_guessed():
    for bad in ["", "   ", "this is not a circuit at all"]:
        try:
            parse_qasm(bad)
        except CircuitParseError:
            continue
        raise AssertionError(f"expected a parse error for {bad!r}")


# ------------------------------------------------------------------ Tier 1


def test_providers_endpoint_reports_availability_honestly():
    body = client.get("/api/v1/providers").json()
    ids = {p["provider_id"] for p in body["providers"]}
    assert {"demo", "ibm"} <= ids
    ibm = next(p for p in body["providers"] if p["provider_id"] == "ibm")
    # Either it is genuinely available, or it says exactly why not — never a silent half-state.
    assert ibm["available"] is True or ibm["reason"]


def test_ibm_endpoints_503_rather_than_fabricate():
    """Without credentials the adapter must refuse, not invent a backend list."""
    r = client.get("/api/v1/providers/ibm/backends")
    assert r.status_code in (200, 503)
    if r.status_code == 503:
        assert r.json()["detail"]["code"] in ("CREDENTIALS_MISSING", "DEPENDENCY_MISSING")
    else:
        assert r.json()["provenance"] == "measured"


def test_the_two_parsers_agree():
    """The browser mirrors the Python fallback, and the fallback must match qiskit.

    CI runs without qiskit, so a drift here silently changes what a user's circuit is judged on —
    exactly the bug this test was written for (the fallback once miscounted a whole-register
    `measure q -> c;` as a single measurement).
    """
    from app.circuits.qasm import _parse_fallback

    for src in (BELL, GHZ4):
        fallback = _parse_fallback(src, "2")
        try:
            authoritative = parse_qasm(src)
        except Exception:  # pragma: no cover - qiskit absent, nothing to compare against
            continue
        if authoritative.parser != "qiskit":
            continue
        assert fallback.qubit_count == authoritative.qubit_count
        assert fallback.measurement_count == authoritative.measurement_count
        assert fallback.two_qubit_gate_count == authoritative.two_qubit_gate_count
        assert fallback.single_qubit_gate_count == authoritative.single_qubit_gate_count
