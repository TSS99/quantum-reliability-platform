"""Matrix evaluator: the 3-valued verdict and its reason codes come from the JSON, not from code."""
from __future__ import annotations

import pytest

from app.qem.matrix import combination, evaluate, load_matrix
from tests.qem.conftest import context


def test_healthy_context_allows_the_implemented_techniques(healthy_context):
    for tid in ("raw", "readout_mitigation", "dynamical_decoupling", "zne"):
        assert evaluate(tid, healthy_context).verdict == "compatible"


def test_zne_rejects_sampling_distribution():
    result = evaluate("zne", context({"task_type": "sampling_distribution"}))
    assert result.verdict == "incompatible"
    assert result.detail_code == "ZNE_REQUIRES_EXPECTATION_VALUE"


@pytest.mark.parametrize(
    "feature,detail",
    [
        ("has_mid_circuit_measurement", "ZNE_INVALID_WITH_MID_CIRCUIT_MEASUREMENT"),
        ("has_reset", "ZNE_INVALID_WITH_RESET"),
        ("has_dynamic_circuit", "ZNE_INVALID_WITH_FEEDFORWARD"),
    ],
)
def test_zne_rejects_non_unitary_and_dynamic_circuits(feature, detail):
    result = evaluate("zne", context({feature: True}))
    assert result.verdict == "incompatible"
    assert result.detail_code == detail


def test_zne_conditional_when_folded_circuit_outruns_t2():
    # duration 60 us x max scale factor 5 = 300 us > t2_median 150 us
    result = evaluate("zne", context({"estimated_duration_us": 60.0}))
    assert result.verdict == "conditional"
    assert result.detail_code == "SCALED_DURATION_EXCEEDS_T2"


def test_zne_conditional_when_folded_depth_exceeds_backend_limit():
    result = evaluate("zne", context(backend_overrides={"max_circuit_depth": 100}))
    assert result.verdict == "conditional"
    assert result.detail_code == "SCALED_DEPTH_EXCEEDS_BACKEND"


def test_dd_needs_idle_exposure():
    result = evaluate("dynamical_decoupling", context({"idle_exposure": 0.0}))
    assert result.verdict == "incompatible"
    assert result.detail_code == "NO_IDLE_WINDOWS"


def test_dd_needs_delay_and_scheduling_support():
    no_delay = evaluate(
        "dynamical_decoupling", context(backend_overrides={"supports_delay_instruction": False})
    )
    assert no_delay.detail_code == "NO_DELAY_SUPPORT"
    no_schedule = evaluate(
        "dynamical_decoupling", context(backend_overrides={"supports_scheduled_circuits": False})
    )
    assert no_schedule.detail_code == "NO_SCHEDULING_SUPPORT"


def test_dd_low_idle_exposure_is_conditional_not_silent():
    result = evaluate("dynamical_decoupling", context({"idle_exposure": 0.01}))
    assert result.verdict == "conditional"
    assert result.detail_code == "LOW_IDLE_EXPOSURE"


def test_readout_mitigation_needs_calibration():
    result = evaluate(
        "readout_mitigation", context(backend_overrides={"provides_readout_calibration": False})
    )
    assert result.verdict == "incompatible"
    assert result.reason_code == "INSUFFICIENT_CALIBRATION_DATA"


def test_stale_readout_calibration_is_conditional():
    result = evaluate("readout_mitigation", context(backend_overrides={"calibration_age_hours": 48.0}))
    assert result.verdict == "conditional"
    assert result.reason_code == "CALIBRATION_STALE"


def test_twirling_is_never_a_standalone_strategy(healthy_context):
    standalone = dict(healthy_context)
    standalone["request.standalone"] = True
    result = evaluate("pauli_twirling", standalone)
    assert result.verdict == "incompatible"
    assert result.detail_code == "TWIRLING_NOT_STANDALONE"


def test_twirling_as_a_modifier_is_allowed(healthy_context):
    modifier = dict(healthy_context)
    modifier["request.standalone"] = False
    assert evaluate("pauli_twirling", modifier).verdict == "compatible"


def test_pec_is_never_executable(healthy_context):
    executable = dict(healthy_context)
    executable["request.executable"] = True
    result = evaluate("pec", executable)
    assert result.verdict == "incompatible"
    assert result.detail_code == "PEC_NOT_EXECUTABLE_IN_V1"


def test_pec_overhead_ceiling_blocks_the_calculator():
    ctx = context(derived={"pec_gamma_squared": 1e6})
    ctx["request.executable"] = False
    result = evaluate("pec", ctx)
    assert result.verdict == "incompatible"
    assert result.reason_code == "MITIGATION_OVERHEAD_TOO_HIGH"


def test_missing_input_is_never_coerced_to_zero():
    ctx = context()
    del ctx["backend.calibration_age_hours"]
    result = evaluate("readout_mitigation", ctx)
    assert result.verdict == "incompatible"
    assert result.reason_code == "INSUFFICIENT_CALIBRATION_DATA"
    assert "backend.calibration_age_hours" in result.missing_fields


def test_dd_plus_zne_requires_reinsertion_after_folding():
    result = combination(["dynamical_decoupling", "zne"])
    assert result.verdict == "conditional"
    assert result.detail_code == "DD_REINSERT_AFTER_FOLD"


def test_twirling_plus_readout_is_not_a_pair():
    result = combination(["pauli_twirling", "readout_mitigation"])
    assert result.verdict == "incompatible"
    assert result.detail_code == "TWIRLING_NOT_STANDALONE"


def test_every_reason_code_used_is_in_the_shared_enum():
    matrix = load_matrix()
    allowed = set(matrix["reason_code_enum"])
    used = {
        rule["reason_code"]
        for entry in matrix["techniques"]
        for rule in entry.get("rules", [])
        if "reason_code" in rule
    }
    used |= {c["reason_code"] for c in matrix["combinations"] if "reason_code" in c}
    assert used <= allowed
