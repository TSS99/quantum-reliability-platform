"""Guards on the one code path that can spend real money.

The deployment decision was a $0 ceiling with submission off by default and per-request
credentials. These tests exist because every one of those is only worth something if it holds when
someone changes the code around it.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.providers import ibm_jobs

client = TestClient(app)

MIN_QASM = 'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\ncreg c[1];\nh q[0];\nmeasure q -> c;'


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    monkeypatch.delenv(ibm_jobs.SUBMIT_FLAG_ENV, raising=False)
    monkeypatch.delenv(ibm_jobs.MAX_SHOTS_ENV, raising=False)


def test_submission_is_disabled_by_default():
    """A deployment that never thinks about billing must not be able to spend."""
    r = client.post(
        "/api/v1/execution/jobs",
        json={"qasm": MIN_QASM, "backend_id": "ibm_brisbane", "shots": 100},
    )
    assert r.status_code == 503
    assert r.json()["detail"]["code"] == "SUBMISSION_DISABLED"


def test_status_reports_the_policy_without_leaking_anything(monkeypatch):
    monkeypatch.setenv("QRP_IBM_TOKEN", "super-secret-token-value")
    r = client.get("/api/v1/execution/status")
    assert r.status_code == 200
    body = r.json()
    assert body["submission_enabled"] is False
    assert body["spend_ceiling_usd"] == 0
    assert body["plan_policy"] == "free_plans_only"
    assert body["credential_model"] == "per_request"
    assert "super-secret-token-value" not in r.text


@pytest.mark.parametrize("shots", [0, -5, 99_999])
def test_shot_count_is_capped_before_anything_reaches_ibm(monkeypatch, shots):
    monkeypatch.setenv(ibm_jobs.SUBMIT_FLAG_ENV, "1")
    r = client.post(
        "/api/v1/execution/jobs",
        json={"qasm": MIN_QASM, "backend_id": "ibm_brisbane", "shots": shots},
    )
    # Pydantic rejects <1 outright; the deployment cap rejects the large one.
    assert r.status_code in (400, 422)
    if r.status_code == 400:
        assert r.json()["detail"]["code"] == "SHOTS_OUT_OF_RANGE"


class _Svc:
    """Stands in for QiskitRuntimeService with a single controllable plan name."""

    def __init__(self, plan):
        self._plan = plan

    @property
    def active_account(self):
        return lambda: {"plan": self._plan} if self._plan is not None else {}

    def instances(self):
        return []


@pytest.mark.parametrize("plan", ["open", "Open Plan", "free"])
def test_free_plans_are_allowed(plan):
    assert ibm_jobs.assert_free_plan(_Svc(plan)) == plan


@pytest.mark.parametrize("plan", ["premium", "standard", "pay-as-you-go", "flex"])
def test_paid_plans_are_refused(plan):
    with pytest.raises(ibm_jobs.SubmissionRefused) as exc:
        ibm_jobs.assert_free_plan(_Svc(plan))
    assert exc.value.code == "PAID_PLAN_REFUSED"


def test_unknown_plan_fails_closed():
    """The whole point: an undeterminable plan is treated as paid, not as free."""
    with pytest.raises(ibm_jobs.SubmissionRefused) as exc:
        ibm_jobs.assert_free_plan(_Svc(None))
    assert exc.value.code == "PLAN_UNKNOWN"


def test_missing_job_is_a_404_that_explains_durability():
    r = client.get("/api/v1/execution/jobs/qrpjob_doesnotexist")
    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "JOB_NOT_FOUND"
    assert "memory" in r.json()["detail"]["message"].lower()


def test_job_json_never_carries_a_credential():
    job = ibm_jobs.Job(job_id="qrpjob_x", backend_id="ibm_brisbane", shots=10)
    body = job.to_json()
    assert "token" not in {k.lower() for k in body}
    assert body["durability"] == "in_memory"
    # No counts yet, so nothing may claim to be measured.
    assert body["provenance"] is None


def test_shot_cap_is_configurable_but_still_enforced(monkeypatch):
    monkeypatch.setenv(ibm_jobs.SUBMIT_FLAG_ENV, "1")
    monkeypatch.setenv(ibm_jobs.MAX_SHOTS_ENV, "256")
    assert ibm_jobs.max_shots() == 256
    r = client.post(
        "/api/v1/execution/jobs",
        json={"qasm": MIN_QASM, "backend_id": "ibm_brisbane", "shots": 300},
    )
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "SHOTS_OUT_OF_RANGE"
