"""Deterministic IDs (MISSION §31/§33): same input => same id, reproducible across reloads."""
import pytest
from app.domain import ids
from app.domain.invariants import check_id_format


def test_workload_id_deterministic_and_seed_sensitive():
    a = ids.workload_id(source_text="Bell state circuit", seed=1)
    assert a == ids.workload_id(source_text="Bell state circuit", seed=1)
    assert a != ids.workload_id(source_text="Bell state circuit", seed=2)
    check_id_format(a)


def test_calibration_snapshot_id_deterministic():
    kw = dict(backend_id="demo-x", captured_at="2026-08-27T00:00:00Z", seed=0)
    assert ids.calibration_snapshot_id(**kw) == ids.calibration_snapshot_id(**kw)
    check_id_format(ids.calibration_snapshot_id(**kw))


def test_receipt_id_deterministic():
    run = "run_0123456789abcdef"
    a = ids.receipt_id(run_id=run)
    assert a == ids.receipt_id(run_id=run)
    check_id_format(a)


def test_bad_id_rejected():
    with pytest.raises(ValueError):
        check_id_format("not a valid id!")
