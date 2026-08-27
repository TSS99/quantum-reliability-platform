"""Shared fixtures: a healthy expectation-value circuit on a fully capable backend."""
from __future__ import annotations

import pytest

from app.qem.matrix import build_context


def healthy_circuit(**overrides):
    circuit = {
        "task_type": "expectation_value",
        "num_qubits": 4,
        "num_measured_qubits": 4,
        "depth": 40,
        "two_qubit_gate_count": 24,
        "idle_exposure": 0.30,
        "has_mid_circuit_measurement": False,
        "has_reset": False,
        "has_dynamic_circuit": False,
        "estimated_duration_us": 20.0,
    }
    circuit.update(overrides)
    return circuit


def healthy_backend(**overrides):
    backend = {
        "supports_delay_instruction": True,
        "supports_scheduled_circuits": True,
        "provides_readout_calibration": True,
        "provides_gate_error_model": True,
        "supports_mid_circuit_measurement": True,
        "max_circuit_depth": None,
        "max_circuits_per_job": 300,
        "t2_median_us": 150.0,
        "calibration_age_hours": 2.0,
    }
    backend.update(overrides)
    return backend


def context(circuit_overrides=None, backend_overrides=None, derived=None):
    return build_context(
        healthy_circuit(**(circuit_overrides or {})),
        healthy_backend(**(backend_overrides or {})),
        derived=derived or {"pec_gamma_squared": 100.0},
    )


@pytest.fixture
def healthy_context():
    return context()
