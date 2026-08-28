# Deploying the backend (Tier 3)

The public prototype at <https://tss99.github.io/quantum-reliability-platform/> is static: it computes
every figure in your browser from seeded demo devices and needs no server. This document covers the
optional backend, which adds two things the static site cannot do — real IBM calibration reads, and
real hardware execution.

## What costs money, and what does not

| Capability | Cost | Needs a token | Needs the flag |
| --- | --- | --- | --- |
| Everything on the static site | none | no | no |
| Real calibration reads (T1/T2, readout, coupler error) | **none** — published properties, no job submitted | yes | no |
| Submitting a circuit to hardware | free plan only, refused otherwise | yes | **yes** |

## Deploy to Render

`render.yaml` at the repository root is a Render blueprint. Point Render at the repo and it builds
`services/api` and serves `uvicorn app.main:app`.

Two variables are deliberately **not** in the blueprint:

- `QRP_IBM_TOKEN` — leave unset. Credentials are per-user; setting a server token would mean every
  visitor spends one account's quota.
- `QRP_ENABLE_HARDWARE_SUBMIT` — leave unset until you have confirmed the account is on a free plan.
  Set it to `1` in the Render dashboard when you want submission on.

| Variable | Default | Purpose |
| --- | --- | --- |
| `QRP_ALLOWED_ORIGINS` | the Pages origin + localhost | CORS allowlist. Never `*`. |
| `QRP_MAX_SHOTS` | `4096` | Server-side shot cap. |
| `QRP_ENABLE_HARDWARE_SUBMIT` | unset (off) | Must be truthy before any job can be submitted. |
| `QRP_IBM_CHANNEL` | `ibm_quantum_platform` | IBM channel. |
| `QRP_IBM_INSTANCE` | unset | Optional instance/CRN. |

## Connecting the frontend

In the app, open **Settings**:

1. Put the backend URL in **Backend endpoint** and press **Connect**. The panel reports the API
   version and the deployment's execution policy — spend ceiling, plan rule, shot cap, job durability.
2. Paste your own IBM Quantum token and press **Hold**. It stays in that tab's memory only: it is
   never written to `localStorage`, `sessionStorage`, a cookie or a URL, and closing the tab discards
   it. **Forget** clears it immediately.

Then **Integrations → Run on real hardware** submits a circuit and polls it.

## The refusals, and what they mean

| Code | HTTP | Meaning |
| --- | --- | --- |
| `SUBMISSION_DISABLED` | 503 | `QRP_ENABLE_HARDWARE_SUBMIT` is not set. |
| `PLAN_UNKNOWN` | 402 | The account's billing plan could not be determined. Refused rather than assumed free. |
| `PAID_PLAN_REFUSED` | 402 | The plan is not a free plan, and this deployment has a $0 ceiling. |
| `SHOTS_OUT_OF_RANGE` | 400 | Above `QRP_MAX_SHOTS`. |
| `CREDENTIALS_INVALID` | 503 | IBM rejected the token. The message never contains the token. |
| `BACKEND_UNAVAILABLE` | 503 | That device is not available to this account. |
| `JOB_NOT_FOUND` | 404 | Unknown job id — job state is in memory and is lost on restart. |

## Known limits

- **Job state is not durable.** It lives in the process. A Render free instance sleeps and restarts,
  and job ids do not survive that. A real datastore is Tier 4 work.
- **No authentication.** Anyone who can reach the URL can call it — which is exactly why submission is
  off by default, capped, and free-plan-only. Do not enable submission on a public deployment you are
  not watching.
- **Predicted vs observed is not yet joined up.** The platform can now obtain measured counts; folding
  them back into the experiment receipt beside the prediction is the next step.
