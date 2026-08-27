"""Schema round-trips for representative Flow-A objects, built from the shared factories."""
from app.schemas.workload import QuantumWorkload
from app.schemas.plan import ExecutionPlan
from app.schemas.receipt import ReliabilityReceipt
from tests import factories as fac


def test_workload_roundtrip():
    w = QuantumWorkload(**fac.workload_kwargs())
    assert QuantumWorkload.model_validate(w.model_dump()) == w


def test_execution_plan_roundtrip():
    p = ExecutionPlan(**fac.execution_plan_kwargs())
    assert ExecutionPlan.model_validate(p.model_dump()) == p


def test_receipt_demo_replay_has_null_actuals():
    r = ReliabilityReceipt(**fac.receipt_kwargs())
    assert r.execution_mode == "demo_replay"
    assert getattr(r, "actual_runtime_seconds", None) is None
    assert getattr(r, "actual_cost_usd", None) is None
