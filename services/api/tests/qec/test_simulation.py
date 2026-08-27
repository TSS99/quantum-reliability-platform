"""QEC_METHODS.md §8 invariants that need the real toolchain (stim + pymatching)."""
from __future__ import annotations

import pytest

pytest.importorskip("stim")
pytest.importorskip("pymatching")

import pymatching  # noqa: E402
import stim  # noqa: E402

from app.qec.config import SimulationConfig  # noqa: E402
from app.qec.decoders import METRIC_FIELDS  # noqa: E402
from app.qec.errors import QecConfigError  # noqa: E402
from app.qec.simulate import build_circuit, build_dem, run_simulation  # noqa: E402


@pytest.mark.parametrize(
    "code, noise_model",
    [
        ("repetition", "code_capacity"),
        ("repetition", "circuit_level"),
        ("rotated_surface", "code_capacity"),
        ("rotated_surface", "circuit_level"),
    ],
)
def test_zero_noise_limit_has_zero_logical_errors(code, noise_model):
    # §8.1
    row = run_simulation(
        SimulationConfig(
            code=code, distance=3, noise_model=noise_model, p=0.0, max_shots=1_000, seed=1
        )
    )
    assert row["logical_errors"] == 0
    assert row["logical_error_rate"] == 0.0
    assert row["logical_error_rate_per_round"] == 0.0
    assert row["detection_event_rate"] == 0.0
    assert row["data_provenance"] == "simulated"


def test_decomposition_guard_surface_code():
    """§8.7: `decompose_errors=True` is a SILENT correctness dependency, so it is asserted.

    Measured against pymatching 2.4.0: `Matching.from_detector_error_model` does NOT reject an
    undecomposed surface-code DEM. It builds a matcher from the hyperedges without complaint, which
    is exactly the failure QEC_METHODS.md §4.2 warns about - Y errors mishandled and the reported
    logical error rate wrong, with no exception anywhere. The only defence is this test.
    """
    config = SimulationConfig(
        code="rotated_surface", distance=3, noise_model="circuit_level", p=0.01
    )
    circuit = build_circuit(config)
    decomposed = str(build_dem(circuit))
    undecomposed = str(circuit.detector_error_model(decompose_errors=False))
    # "^" is the DEM separator between the components of a decomposed (e.g. Y) error.
    assert "^" in decomposed
    assert "^" not in undecomposed
    assert decomposed != undecomposed
    pymatching.Matching.from_detector_error_model(
        circuit.detector_error_model(decompose_errors=False)
    )  # documents that this does NOT raise; the flag is our responsibility, not pymatching's


def test_same_seed_reproduces_the_same_counts():
    # §8.6
    config = SimulationConfig(
        code="repetition", distance=5, noise_model="phenomenological", p=0.05,
        max_shots=5_000, max_errors=10**9, seed=7,
    )
    first = run_simulation(config)
    second = run_simulation(config)
    assert first["logical_errors"] == second["logical_errors"]
    assert first["detection_event_rate"] == second["detection_event_rate"]


def test_more_shots_tighten_the_simulated_interval():
    def width(max_shots: int) -> float:
        row = run_simulation(
            SimulationConfig(
                code="repetition", distance=3, noise_model="code_capacity", p=0.1,
                max_shots=max_shots, max_errors=10**9, seed=3,
            )
        )
        return row["ler_ci_high"] - row["ler_ci_low"]

    assert width(20_000) < width(2_000)


def test_not_implemented_decoders_return_null_metrics():
    # §8.9 / §27 / §71: declared, never estimated.
    for decoder_id in ("bp", "bp_osd", "union_find", "gpu_decoder", "custom", "majority_vote"):
        row = run_simulation(
            SimulationConfig(
                code="repetition", distance=3, noise_model="code_capacity", p=0.05,
                decoder_id=decoder_id,
            )
        )
        assert row["decoder_status"] == "NOT_IMPLEMENTED"
        assert row["not_implemented_reason"]
        assert all(row[field] is None for field in METRIC_FIELDS)


def test_unknown_decoder_is_rejected():
    with pytest.raises(QecConfigError):
        run_simulation(
            SimulationConfig(
                code="repetition", distance=3, noise_model="code_capacity", p=0.05,
                decoder_id="quantum_oracle",
            )
        )


def test_surface_code_qubit_counts_match_the_generated_circuit():
    config = SimulationConfig(
        code="rotated_surface", distance=3, noise_model="circuit_level", p=0.001
    )
    circuit = build_circuit(config)
    # §2.3 counts qubits actually used (2d^2-1 = 17). `num_qubits` is the index span, which the
    # rotated-surface generator leaves sparse (26 for d=3) - a real trap for a resource estimate.
    assert len(circuit.get_final_qubit_coordinates()) == 17
    assert isinstance(circuit, stim.Circuit)
    repetition = build_circuit(
        SimulationConfig(code="repetition", distance=3, noise_model="circuit_level", p=0.001)
    )
    assert len(repetition.get_final_qubit_coordinates()) == 5
