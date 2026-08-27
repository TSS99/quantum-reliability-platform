"""Valid-object builders for the nine Flow-A domain objects (DOMAIN_MODEL.md §3).

Each `*_kwargs()` returns a plain dict a test can override before constructing the model, so an
invariant-violation test can do `Model(**{**valid_kwargs(), "field": bad_value})` and assert it raises.
Ids are derived with `app.domain.ids` from one coherent fixture story so cross-references (e.g. a plan's
`circuit_fingerprint` matching a profile's) are real, not just string lookalikes.
"""
from __future__ import annotations

from app.domain import ids

SEED = 42
BACKEND_ID = "ibm_test_backend"
CAPTURED_AT = "2026-08-27T00:00:00Z"

CIRCUIT_FINGERPRINT = ids.circuit_fingerprint(
    qubit_count=2,
    depth=3,
    gate_histogram={"cx": 1, "h": 1},
    two_qubit_ratio=0.5,
    measurement_pattern="all",
    observable_profile="ZZ",
    connectivity_class="linear",
    parameter_count=0,
)
CALIBRATION_SNAPSHOT_ID = ids.calibration_snapshot_id(
    backend_id=BACKEND_ID, captured_at=CAPTURED_AT, seed=SEED
)
STRATEGY_ID = "zne_folding"
_GOAL_HASH_INPUT = {"target_error": 0.05, "confidence_target": 0.95, "priority": "balanced"}
PLAN_ID = ids.plan_id(
    circuit_fingerprint=CIRCUIT_FINGERPRINT,
    backend_id=BACKEND_ID,
    strategy_id=STRATEGY_ID,
    goal=_GOAL_HASH_INPUT,
    seed=SEED,
)
SHOTS = 1000
RUN_ID = ids.run_id(plan_id=PLAN_ID, shots=SHOTS, seed=SEED)
RECEIPT_ID = ids.receipt_id(run_id=RUN_ID)


def quantity_kwargs(**overrides) -> dict:
    kwargs = dict(value=0.5, unit="probability", provenance="demo_fixture", method_ref="TEST#ref")
    kwargs.update(overrides)
    return kwargs


def observable_kwargs(**overrides) -> dict:
    kwargs = dict(
        name="ZZ",
        pauli_terms=[dict(pauli="ZZ", coefficient=1.0)],
        normalized=True,
    )
    kwargs.update(overrides)
    return kwargs


def workload_kwargs(**overrides) -> dict:
    kwargs = dict(
        workload_id="bell_state_demo",
        name="Bell state",
        source="example",
        qasm="OPENQASM 3;",
        observable=observable_kwargs(),
    )
    kwargs.update(overrides)
    return kwargs


def circuit_profile_kwargs(**overrides) -> dict:
    kwargs = dict(
        circuit_fingerprint=CIRCUIT_FINGERPRINT,
        workload_id="bell_state_demo",
        qubit_count=2,
        depth=3,
        gate_count=2,
        two_qubit_gate_count=1,
        measurement_count=2,
        gate_histogram={"cx": 1, "h": 1},
        two_qubit_ratio=0.5,
        parameter_count=0,
        connectivity_class="linear",
        idle_exposure=quantity_kwargs(value=0.0, unit="microseconds", method_ref="TEST#idle"),
        has_dynamic_circuits=False,
        has_mid_circuit_measurement=False,
        observable_count=1,
        analysis_provenance="measured",
    )
    kwargs.update(overrides)
    return kwargs


def qec_capability_kwargs(**overrides) -> dict:
    kwargs = dict(
        measurement_latency_us=None,
        reset_latency_us=None,
        feed_forward_latency_us=None,
        leakage_rate=None,
        decoder_latency_budget_us=None,
        syndrome_cycle_estimate_us=None,
        classical_bandwidth_ref=None,
    )
    kwargs.update(overrides)
    return kwargs


def hardware_profile_kwargs(**overrides) -> dict:
    kwargs = dict(
        backend_id=BACKEND_ID,
        provider_id="ibm",
        display_name="IBM Test Backend",
        technology="superconducting",
        adapter_status="implemented",
        qubit_count=5,
        coupling_map=[(0, 1), (1, 2)],
        connectivity_class="linear",
        basis_gates=["cx", "h", "rz"],
        supports_dynamic_circuits=False,
        supports_mid_circuit_measurement=False,
        supports_delay_scheduling=True,
        supports_reset=True,
        latest_calibration_snapshot_id=CALIBRATION_SNAPSHOT_ID,
        qec_capability=qec_capability_kwargs(),
        pricing_ref="ibm_test_backend_v1",
    )
    kwargs.update(overrides)
    return kwargs


def calibration_metrics_kwargs(**overrides) -> dict:
    kwargs = dict(
        t1_us=quantity_kwargs(value=100.0, unit="microseconds", method_ref="TEST#t1"),
        t2_us=quantity_kwargs(value=80.0, unit="microseconds", method_ref="TEST#t2"),
        single_qubit_error_rate=quantity_kwargs(value=0.001, method_ref="TEST#sqer"),
        two_qubit_error_rate=quantity_kwargs(value=0.01, method_ref="TEST#tqer"),
        readout_error_rate=quantity_kwargs(value=0.02, method_ref="TEST#ro"),
        measurement_time_us=quantity_kwargs(value=1.0, unit="microseconds", method_ref="TEST#mt"),
        per_qubit=None,
    )
    kwargs.update(overrides)
    return kwargs


def calibration_validity_kwargs(**overrides) -> dict:
    kwargs = dict(
        state="stable",
        thresholds_ref="TEST#thresholds",
        explanation="within configured thresholds",
        drift_findings=[],
    )
    kwargs.update(overrides)
    return kwargs


def calibration_snapshot_kwargs(**overrides) -> dict:
    kwargs = dict(
        calibration_snapshot_id=CALIBRATION_SNAPSHOT_ID,
        backend_id=BACKEND_ID,
        captured_at=CAPTURED_AT,
        age_seconds=60.0,
        metrics=calibration_metrics_kwargs(),
        validity=calibration_validity_kwargs(),
        seed=SEED,
    )
    kwargs.update(overrides)
    return kwargs


def score_weights_kwargs(**overrides) -> dict:
    kwargs = dict(w_error=0.4, w_cost=0.3, w_time=0.3, w_qubit_overhead=0.0, w_decoder_latency=0.0)
    kwargs.update(overrides)
    return kwargs


def reliability_goal_kwargs(**overrides) -> dict:
    kwargs = dict(
        target_error=quantity_kwargs(value=0.05, unit="expectation_value", method_ref="TEST#target"),
        confidence_target=0.95,
        max_cost_usd=quantity_kwargs(value=10.0, unit="usd", method_ref="TEST#cost"),
        max_runtime_seconds=quantity_kwargs(value=60.0, unit="seconds", method_ref="TEST#time"),
        priority="balanced",
        weights=None,
    )
    kwargs.update(overrides)
    return kwargs


def compatibility_kwargs(**overrides) -> dict:
    kwargs = dict(verdict="compatible", conditions=[], reason_codes=[])
    kwargs.update(overrides)
    return kwargs


def mitigation_strategy_kwargs(**overrides) -> dict:
    kwargs = dict(
        strategy_id=STRATEGY_ID,
        display_name="ZNE (gate folding)",
        family="zne",
        maturity="implemented",
        executable=True,
        twirling_enabled=False,
        parameters={"scale_factors": "1,2,3"},
        compatibility=compatibility_kwargs(),
        method_ref="QEM_METHODS.md#zne-gate-folding",
    )
    kwargs.update(overrides)
    return kwargs


def cost_estimate_kwargs(**overrides) -> dict:
    kwargs = dict(
        estimated_cost_usd=quantity_kwargs(value=1.5, unit="usd", method_ref="TEST#cost"),
        estimated_qpu_seconds=quantity_kwargs(value=5.0, unit="seconds", method_ref="TEST#qpu"),
        estimated_queue_seconds=None,
        minimum_charge_usd=None,
        pricing_model_ref="TEST#pricing",
    )
    kwargs.update(overrides)
    return kwargs


def statistical_confidence_kwargs(**overrides) -> dict:
    kwargs = dict(level=0.95, interval=(0.4, 0.6), method="wilson", insufficient_statistics=False)
    kwargs.update(overrides)
    return kwargs


def strategy_confidence_kwargs(**overrides) -> dict:
    kwargs = dict(value=0.8, basis="compatibility=compatible; calibration_age=1h; regime=in-range")
    kwargs.update(overrides)
    return kwargs


def reliability_estimate_kwargs(**overrides) -> dict:
    bias = 0.03
    std = 0.04
    rmse = (bias**2 + std**2) ** 0.5
    kwargs = dict(
        bias_estimate=quantity_kwargs(value=bias, unit="expectation_value", method_ref="TEST#bias"),
        stat_std=quantity_kwargs(value=std, unit="expectation_value", method_ref="TEST#std"),
        rmse=quantity_kwargs(value=rmse, unit="expectation_value", method_ref="TEST#rmse"),
        statistical_confidence=statistical_confidence_kwargs(),
        strategy_confidence=strategy_confidence_kwargs(),
        sampling_overhead=quantity_kwargs(value=3.0, unit="ratio", method_ref="TEST#overhead"),
        variance_inflation=quantity_kwargs(value=1.2, unit="ratio", method_ref="TEST#inflation"),
        method_ref="QEM_METHODS.md#zne-gate-folding",
    )
    kwargs.update(overrides)
    return kwargs


def score_term_kwargs(**overrides) -> dict:
    kwargs = dict(key="error", raw_value=0.03, normalized_value=0.7, weight=0.4, contribution=0.28)
    kwargs.update(overrides)
    return kwargs


def score_breakdown_kwargs(**overrides) -> dict:
    kwargs = dict(
        total=0.65,
        terms=[score_term_kwargs()],
        weights=score_weights_kwargs(),
        normalization_ref="TEST#normalization",
        tie_break_applied=False,
    )
    kwargs.update(overrides)
    return kwargs


def execution_plan_kwargs(**overrides) -> dict:
    kwargs = dict(
        plan_id=PLAN_ID,
        circuit_fingerprint=CIRCUIT_FINGERPRINT,
        backend_id=BACKEND_ID,
        calibration_snapshot_id=CALIBRATION_SNAPSHOT_ID,
        strategy=mitigation_strategy_kwargs(),
        shots=SHOTS,
        cost_estimate=cost_estimate_kwargs(),
        reliability_estimate=reliability_estimate_kwargs(),
        feasibility="feasible",
        findings=[],
        score=score_breakdown_kwargs(),
        is_recommended=True,
        seed=SEED,
    )
    kwargs.update(overrides)
    return kwargs


def lineage_kwargs(**overrides) -> dict:
    kwargs = dict(
        qrp_version="0.1.0",
        schema_version="1.0.0",
        seed=SEED,
        circuit_fingerprint=CIRCUIT_FINGERPRINT,
        calibration_snapshot_id=CALIBRATION_SNAPSHOT_ID,
        library_versions={"qiskit": "1.2.0", "numpy": "2.0.0"},
        generated_at="2026-08-27T00:05:00Z",
    )
    kwargs.update(overrides)
    return kwargs


def experiment_run_kwargs(**overrides) -> dict:
    kwargs = dict(
        run_id=RUN_ID,
        plan_id=PLAN_ID,
        execution_mode="demo_replay",
        started_at="2026-08-27T00:00:00Z",
        completed_at="2026-08-27T00:00:05Z",
        status="completed",
        shots=SHOTS,
        seed=SEED,
        raw_estimate=quantity_kwargs(value=0.4, unit="expectation_value", method_ref="TEST#raw"),
        processed_estimate=quantity_kwargs(
            value=0.48, unit="expectation_value", method_ref="TEST#processed"
        ),
        statistical_confidence=statistical_confidence_kwargs(),
        actual_runtime_seconds=None,
        actual_cost_usd=None,
        lineage=lineage_kwargs(),
        warnings=[],
    )
    kwargs.update(overrides)
    return kwargs


def receipt_kwargs(**overrides) -> dict:
    kwargs = dict(
        receipt_id=RECEIPT_ID,
        schema_version="1.0.0",
        qrp_version="0.1.0",
        execution_mode="demo_replay",
        run_id=RUN_ID,
        generated_at="2026-08-27T00:05:00Z",
        circuit_fingerprint=CIRCUIT_FINGERPRINT,
        workload_name="Bell state",
        observable=observable_kwargs(),
        backend_id=BACKEND_ID,
        calibration_snapshot_id=CALIBRATION_SNAPSHOT_ID,
        strategy=mitigation_strategy_kwargs(),
        shots=SHOTS,
        raw_estimate=quantity_kwargs(value=0.4, unit="expectation_value", method_ref="TEST#raw"),
        processed_estimate=quantity_kwargs(
            value=0.48, unit="expectation_value", method_ref="TEST#processed"
        ),
        statistical_confidence=statistical_confidence_kwargs(),
        strategy_confidence=strategy_confidence_kwargs(),
        improvement=quantity_kwargs(value=0.08, unit="expectation_value", method_ref="TEST#improve"),
        estimated_runtime_seconds=quantity_kwargs(value=5.0, unit="seconds", method_ref="TEST#ert"),
        estimated_cost_usd=quantity_kwargs(value=1.5, unit="usd", method_ref="TEST#ecu"),
        actual_runtime_seconds=None,
        actual_cost_usd=None,
        goal=reliability_goal_kwargs(),
        goal_result="met",
        warnings=[],
        lineage=lineage_kwargs(),
    )
    kwargs.update(overrides)
    return kwargs
