"""IBM Quantum job submission — Tier 3, async, off by default.

Tier 1 reads a device's published calibration, which is free and instant. This module is the other
thing: actually putting a circuit on hardware. That spends someone's quota and takes minutes to
hours, so every guard here fails CLOSED.

The four decisions this implements, taken deliberately and recorded in docs/DECISIONS.md:

* **Submission is disabled unless ``QRP_ENABLE_HARDWARE_SUBMIT`` is truthy.** A deployment that
  forgets to think about this cannot spend money. The endpoint reports 503 with a reason.
* **Credentials are per-user and per-request.** The caller supplies their own IBM token on the
  request; it is used for that call and dropped. It is never written to disk, never logged, never
  placed in a URL, never returned in a response, and no session or database holds it. The
  server-side ``QRP_IBM_TOKEN`` remains only as a local-development convenience.
* **A hard $0 ceiling.** Only free/open-plan instances may be used. The plan is resolved from the
  service, and anything that is not positively identified as free is REFUSED — an unknown plan is
  treated as paid, because the failure mode of guessing wrong costs real money.
* **Nothing is fabricated.** If a job cannot be submitted or read, the caller gets a reason code,
  never a synthesised result.

Job state lives in memory. That is honest for this tier: on Render's free instances the process
sleeps and restarts, so a job id does not survive a redeploy, and the API says so rather than
pretending to be a durable queue. Durability is a Tier 4 concern along with a real datastore.
"""
from __future__ import annotations

import os
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from .ibm import CHANNEL_ENV, INSTANCE_ENV, TOKEN_ENV, IBMUnavailable

SUBMIT_FLAG_ENV = "QRP_ENABLE_HARDWARE_SUBMIT"
MAX_SHOTS_ENV = "QRP_MAX_SHOTS"

#: Refused above this regardless of plan: a free plan still has a finite time budget, and an
#: accidental extra zero on the shot count is the cheapest mistake to make.
DEFAULT_MAX_SHOTS = 4096

#: Plan names IBM uses for its no-cost tiers. Matching is substring and case-insensitive, and
#: anything not matched is treated as PAID. Widen this only with evidence.
FREE_PLAN_MARKERS = ("open", "free")


def submission_enabled() -> bool:
    return os.environ.get(SUBMIT_FLAG_ENV, "").strip().lower() in {"1", "true", "yes", "on"}


def max_shots() -> int:
    raw = os.environ.get(MAX_SHOTS_ENV, "")
    try:
        return max(1, int(raw))
    except ValueError:
        return DEFAULT_MAX_SHOTS


class SubmissionRefused(RuntimeError):
    """A refusal the API surfaces verbatim, with a machine-readable code."""

    def __init__(self, reason: str, *, code: str) -> None:
        super().__init__(reason)
        self.code = code


def _service_for(token: str | None) -> Any:
    """Build a service for THIS caller's token.

    Mirrors ibm._service but takes the token as an argument rather than reading the environment
    first, because on this path the credential belongs to the user, not the deployment.
    """
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService
    except ImportError as exc:
        raise IBMUnavailable(
            "qiskit-ibm-runtime is not installed: pip install '.[quantum]'",
            code="DEPENDENCY_MISSING",
        ) from exc

    kwargs: dict[str, Any] = {}
    effective = token or os.environ.get(TOKEN_ENV)
    if effective:
        kwargs["token"] = effective
        kwargs["channel"] = os.environ.get(CHANNEL_ENV, "ibm_quantum_platform")
        if os.environ.get(INSTANCE_ENV):
            kwargs["instance"] = os.environ[INSTANCE_ENV]
    try:
        return QiskitRuntimeService(**kwargs)
    except Exception as exc:  # noqa: BLE001 - the reason is surfaced, not swallowed
        # Deliberately does not interpolate the token into the message.
        raise IBMUnavailable(
            f"IBM Quantum rejected these credentials: {type(exc).__name__}",
            code="CREDENTIALS_INVALID",
        ) from exc


def _plan_of(service: Any) -> str | None:
    """Best-effort plan name for the active instance, or None if it cannot be determined."""
    for attr in ("active_account", "account"):
        try:
            acct = getattr(service, attr)
            data = acct() if callable(acct) else acct
            if isinstance(data, dict):
                for key in ("plan", "plan_name", "instance_plan"):
                    if data.get(key):
                        return str(data[key])
        except Exception:  # noqa: BLE001 - absence is handled by the caller
            continue
    try:
        instances = service.instances()
        if instances:
            first = instances[0]
            if isinstance(first, dict):
                for key in ("plan", "plan_name"):
                    if first.get(key):
                        return str(first[key])
    except Exception:  # noqa: BLE001
        pass
    return None


def assert_free_plan(service: Any) -> str:
    """Refuse anything not positively identified as a free plan.

    Fails closed on purpose. An unknown plan is refused rather than assumed free, because the cost
    of being wrong is a real bill on someone else's account.
    """
    plan = _plan_of(service)
    if plan is None:
        raise SubmissionRefused(
            "Could not determine the billing plan for this account, so submission is refused. "
            "This deployment is configured for a $0 ceiling and only runs on free/open plans.",
            code="PLAN_UNKNOWN",
        )
    if not any(marker in plan.lower() for marker in FREE_PLAN_MARKERS):
        raise SubmissionRefused(
            f"Account plan {plan!r} is not a free plan. This deployment is configured for a $0 "
            "ceiling and will not submit jobs that can incur cost.",
            code="PAID_PLAN_REFUSED",
        )
    return plan


@dataclass
class Job:
    """One submitted job. Deliberately holds no credential."""

    job_id: str
    backend_id: str
    shots: int
    status: str = "submitted"
    provider_job_id: str | None = None
    submitted_at: float = field(default_factory=time.time)
    completed_at: float | None = None
    counts: dict[str, int] | None = None
    error: str | None = None
    error_code: str | None = None

    def to_json(self) -> dict:
        return {
            "job_id": self.job_id,
            "backend_id": self.backend_id,
            "shots": self.shots,
            "status": self.status,
            "provider_job_id": self.provider_job_id,
            "submitted_at": self.submitted_at,
            "completed_at": self.completed_at,
            "counts": self.counts,
            "error": self.error,
            "error_code": self.error_code,
            "provenance": "measured" if self.counts else None,
            "durability": "in_memory",
        }


class JobStore:
    """In-memory job registry. Not durable, and the API says so."""

    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def put(self, job: Job) -> None:
        with self._lock:
            self._jobs[job.job_id] = job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def list(self) -> list[Job]:
        with self._lock:
            return sorted(self._jobs.values(), key=lambda j: j.submitted_at, reverse=True)


STORE = JobStore()


def submit(*, qasm: str, backend_id: str, shots: int, token: str | None) -> Job:
    """Submit one circuit. Every guard runs before anything reaches IBM."""
    if not submission_enabled():
        raise SubmissionRefused(
            f"Hardware submission is disabled on this deployment. Set {SUBMIT_FLAG_ENV}=1 to "
            "enable it, after confirming the account's billing plan.",
            code="SUBMISSION_DISABLED",
        )
    cap = max_shots()
    if shots < 1 or shots > cap:
        raise SubmissionRefused(
            f"shots must be between 1 and {cap} on this deployment.",
            code="SHOTS_OUT_OF_RANGE",
        )

    service = _service_for(token)
    assert_free_plan(service)

    try:
        from qiskit import QuantumCircuit, transpile
        from qiskit_ibm_runtime import SamplerV2
    except ImportError as exc:
        raise IBMUnavailable(
            "qiskit / qiskit-ibm-runtime are not installed: pip install '.[quantum]'",
            code="DEPENDENCY_MISSING",
        ) from exc

    try:
        backend = service.backend(backend_id)
    except Exception as exc:  # noqa: BLE001
        raise SubmissionRefused(
            f"Backend {backend_id!r} is not available to this account: {type(exc).__name__}",
            code="BACKEND_UNAVAILABLE",
        ) from exc

    try:
        circuit = QuantumCircuit.from_qasm_str(qasm)
    except Exception as exc:  # noqa: BLE001
        raise SubmissionRefused(f"Circuit did not parse: {exc}", code="INVALID_CIRCUIT") from exc

    isa = transpile(circuit, backend=backend)
    sampler = SamplerV2(mode=backend)
    provider_job = sampler.run([isa], shots=shots)

    job = Job(
        job_id=f"qrpjob_{uuid.uuid4().hex[:12]}",
        backend_id=backend_id,
        shots=shots,
        status="queued",
        provider_job_id=getattr(provider_job, "job_id", lambda: None)()
        if callable(getattr(provider_job, "job_id", None))
        else None,
    )
    STORE.put(job)
    return job


def refresh(job: Job, *, token: str | None) -> Job:
    """Poll IBM for this job and fold the result in. Never invents a result."""
    if job.status in {"completed", "failed"} or not job.provider_job_id:
        return job

    service = _service_for(token)
    try:
        provider_job = service.job(job.provider_job_id)
        state = str(provider_job.status()).upper()
    except Exception as exc:  # noqa: BLE001
        job.status = "unknown"
        job.error = f"Could not read job state: {type(exc).__name__}"
        job.error_code = "POLL_FAILED"
        STORE.put(job)
        return job

    if "DONE" in state or "COMPLETED" in state:
        try:
            result = provider_job.result()
            pub = result[0]
            data = pub.data
            reg = next(iter(vars(data).values())) if vars(data) else None
            job.counts = dict(reg.get_counts()) if reg is not None else None
            job.status = "completed"
            job.completed_at = time.time()
        except Exception as exc:  # noqa: BLE001
            job.status = "failed"
            job.error = f"Job finished but the result could not be read: {type(exc).__name__}"
            job.error_code = "RESULT_UNREADABLE"
    elif "ERROR" in state or "CANCELLED" in state or "FAILED" in state:
        job.status = "failed"
        job.error = f"IBM reported job state {state}."
        job.error_code = "PROVIDER_JOB_FAILED"
    else:
        job.status = "running" if "RUNNING" in state else "queued"

    STORE.put(job)
    return job


def status() -> dict:
    """What this deployment will and will not do — safe to expose publicly."""
    return {
        "submission_enabled": submission_enabled(),
        "max_shots": max_shots(),
        "spend_ceiling_usd": 0,
        "plan_policy": "free_plans_only",
        "credential_model": "per_request",
        "job_durability": "in_memory",
    }
