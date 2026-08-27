"""QEC_METHODS.md §8.8 — impossible configs are rejected, never simulated."""
from __future__ import annotations

import pytest

from app.qec.config import SimulationConfig, default_rounds, physical_qubits, validate
from app.qec.errors import QecConfigError


def cfg(**overrides) -> SimulationConfig:
    base = dict(code="repetition", distance=3, noise_model="code_capacity", p=0.01)
    base.update(overrides)
    return SimulationConfig(**base)


@pytest.mark.parametrize(
    "overrides, field",
    [
        ({"distance": 4}, "distance"),
        ({"distance": 1}, "distance"),
        ({"distance": 0}, "distance"),
        ({"p": 1.5}, "p"),
        ({"p": -0.001}, "p"),
        ({"rounds": 0}, "rounds"),
        ({"max_shots": 0}, "max_shots"),
        ({"code": "toric"}, "code"),
        ({"noise_model": "si1000"}, "noise_model"),
    ],
)
def test_impossible_configs_are_rejected_with_a_reason_code(overrides, field):
    with pytest.raises(QecConfigError) as excinfo:
        validate(cfg(**overrides))
    error = excinfo.value
    assert error.code == "QEC_CAPABILITY_MISSING"
    assert error.field == field
    assert error.to_payload()["evidence"]["field"] == field


def test_valid_v1_configs_pass():
    for code in ("repetition", "rotated_surface"):
        for distance in (3, 5, 7):
            for noise_model in ("code_capacity", "phenomenological", "circuit_level"):
                validate(cfg(code=code, distance=distance, noise_model=noise_model))


def test_rounds_follow_the_noise_tier():
    assert default_rounds("rotated_surface", "code_capacity", 7) == 1
    assert default_rounds("rotated_surface", "phenomenological", 7) == 7
    assert default_rounds("rotated_surface", "circuit_level", 5) == 5
    assert cfg(noise_model="circuit_level", distance=5).resolved_rounds() == 5


def test_physical_qubit_accounting_matches_the_stated_formulas():
    # §2.3: 2d-1 repetition, 2d^2-1 rotated surface — memory patch, one logical qubit.
    assert [physical_qubits("repetition", d) for d in (3, 5, 7)] == [5, 9, 13]
    assert [physical_qubits("rotated_surface", d) for d in (3, 5, 7)] == [17, 49, 97]


def test_noise_kwargs_realise_the_documented_tier_table():
    p = 0.007
    assert cfg(noise_model="code_capacity", p=p).noise_kwargs() == {
        "before_round_data_depolarization": p,
        "before_measure_flip_probability": 0.0,
        "after_reset_flip_probability": 0.0,
        "after_clifford_depolarization": 0.0,
    }
    assert cfg(noise_model="phenomenological", p=p).noise_kwargs() == {
        "before_round_data_depolarization": p,
        "before_measure_flip_probability": p,
        "after_reset_flip_probability": 0.0,
        "after_clifford_depolarization": 0.0,
    }
    assert all(v == p for v in cfg(noise_model="circuit_level", p=p).noise_kwargs().values())
