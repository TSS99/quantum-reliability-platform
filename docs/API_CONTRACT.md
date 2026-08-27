# API_CONTRACT — QRP V1

**Status:** Phase-1 authored (Architect); reason-code module co-owned with the Optimizer (RECON-21).
**Base path:** `/api/v1`. **Types:** every payload shape referenced here is specified in
`DOMAIN_MODEL.md`.

---

## 1. How this contract exists (RECON-1)

```
services/api/app/schemas/*.py   (Pydantic — THE source of truth)
        │  FastAPI
        ▼
   openapi.json                 (committed artifact)
        │  generator (npm script, run in CI)
        ▼
packages/contracts/             (TypeScript types + Zod schemas — GENERATED, committed)
```

- The frontend imports **only** from `packages/contracts/`. Hand-writing a TypeScript double of a domain
  type is a review-blocking error.
- CI runs the generator and fails on a diff (**staleness check**). A contract change is therefore always
  a backend change plus a regenerated commit.
- npm workspaces span `apps/web` + `packages/contracts` only; Python is managed by `pyproject`. No Nx, no
  Turborepo (RECON-5, §8).
- `apps/web/**` is lint-blocked (`no-restricted-imports`) from importing `services/api/**`. `DemoProvider`
  is the only browser-reachable adapter (RECON-29).

## 2. Wire conventions

- **`snake_case` everywhere**, and `demo-data/` fixtures are byte-compatible with API responses so the
  `DemoReliabilityDataSource` → `ApiReliabilityDataSource` swap is a one-line change (RECON-2, §49).
- **Timestamps:** RFC 3339 UTC with `Z`.
- **Probabilities and error rates are `0–1` on the wire.** Percent exists only in the UI formatter
  (RECON-3).
- **Money is `*_usd`; time is `*_seconds` or `*_us`.** The suffix and the `Quantity.unit` must agree —
  enforced by the shared validator (§51).
- **Every physical or estimated number is a `Quantity`:**

```json
"two_qubit_error_rate": {
  "value": 0.0082,
  "unit": "probability",
  "provenance": "demo_fixture",
  "method_ref": "DEMO_VS_REAL.md#backend-calibration"
}
```

  Exact structural integers (`qubit_count`, `depth`, `shots`, `seed`, gate counts) are plain integers —
  see `DOMAIN_MODEL.md` §1.1 and `DECISIONS.md` ADR-0011.
- **`target_error`** is absolute error on a normalized observable ⟨O⟩ ∈ [-1, 1]; unit
  `expectation_value` (RECON-10, `DOMAIN_MODEL.md` §1.3).
- **Confidence is always two fields** — `statistical_confidence` and `strategy_confidence`. No endpoint
  returns a single scalar "confidence" (RECON-9).
- **Pagination:** list endpoints take `limit` (default 50, max 200) and `cursor`; they return
  `{ items, next_cursor }`. `next_cursor` is `null` at the end.
- **Determinism:** requests that produce ids or rankings accept an optional `seed` (default `0`). The
  same `(seed, inputs)` returns a byte-identical body (RECON-7, invariant I-12).

## 3. The shared reason-code module (RECON-21)

**One enum, one severity table, one precedence rule, used by both Preflight and the Optimizer.** Lives at
`services/api/app/domain/reason_codes.py` and is exported through `packages/contracts/`.

```python
ReasonCode = Literal[
    "COST_EXCEEDED",
    "TARGET_ERROR_UNLIKELY",
    "CALIBRATION_STALE",
    "MITIGATION_OVERHEAD_TOO_HIGH",
    "UNSUPPORTED_CIRCUIT_FEATURE",
    "QEC_CAPABILITY_MISSING",
    "INSUFFICIENT_CALIBRATION_DATA",
]

Severity = Literal["blocking", "warning", "insufficient_data"]

class Finding(BaseModel):
    code: ReasonCode
    severity: Severity
    subject: Literal["circuit", "backend", "calibration", "strategy", "goal", "plan"]
    subject_id: str | None
    message: str                 # deterministic template render — never LLM prose (RECON-20)
    evidence: dict[str, Quantity | float | int | str]
```

**Default severities** (a code may escalate to `blocking` when it crosses a hard constraint; it may never
silently de-escalate):

| Code | Default | Escalates to `blocking` when |
|---|---|---|
| `COST_EXCEEDED` | `blocking` | — (always blocking; a hard constraint, §29) |
| `TARGET_ERROR_UNLIKELY` | `warning` | the best feasible plan's `rmse` exceeds `target_error` by ≥ 10× |
| `CALIBRATION_STALE` | `warning` | `validity.state == "significant_drift"` |
| `MITIGATION_OVERHEAD_TOO_HIGH` | `warning` | `sampling_overhead` pushes cost or runtime past the goal |
| `UNSUPPORTED_CIRCUIT_FEATURE` | `blocking` | — (e.g. ZNE on a dynamic/mid-circuit-measurement circuit) |
| `QEC_CAPABILITY_MISSING` | `blocking` | — (requested mode needs a capability the backend lacks) |
| `INSUFFICIENT_CALIBRATION_DATA` | `insufficient_data` | — |

**Status precedence — computed, never hand-set:**

```
INSUFFICIENT_DATA  >  DO_NOT_RUN  >  RUN_WITH_WARNING  >  RUN
```

```python
def status_from(findings: list[Finding]) -> PreflightStatus:
    if any(f.severity == "insufficient_data" for f in findings): return "INSUFFICIENT_DATA"
    if any(f.severity == "blocking"          for f in findings): return "DO_NOT_RUN"
    if any(f.severity == "warning"           for f in findings): return "RUN_WITH_WARNING"
    return "RUN"
```

The optimizer uses the same `Finding` list: Stage A marks a candidate `infeasible` iff it carries any
`blocking` finding, before any scoring happens (RECON-19).

## 4. Error envelope (§43)

Non-2xx responses share one shape. Error copy states what failed, what remains safe, and what to do next
— never a bare "Something went wrong."

```json
{
  "error": {
    "code": "CIRCUIT_PARSE_FAILED",
    "message": "The OpenQASM could not be parsed at line 14.",
    "safe": "Nothing was executed and no cost was incurred.",
    "next_steps": "Check that the file is OpenQASM 3 and under 256 KB, then re-upload.",
    "details": { "line": 14, "token": "cx" },
    "request_id": "req_9f2c1a0b"
  }
}
```

| HTTP | When |
|---|---|
| `400` | Malformed request body / failed Zod-Pydantic validation |
| `404` | Unknown `backend_id`, `experiment_id`, `receipt_id` |
| `413` | Circuit payload over 256 KB (RECON-31) |
| `422` | Well-formed but rejected circuit — over qubit/gate/depth caps, parse timeout |
| `501` | A declared-but-unimplemented path (e.g. a `NOT_IMPLEMENTED` decoder, RECON-17) |
| `500` | Unhandled — logged with `request_id`, never leaking internals |

A `DO_NOT_RUN` preflight verdict is **`200 OK`**, not an error. It is a successful answer to the question
that was asked.

## 5. Endpoints

Thirteen from §50, plus one addition noted at §5.14. Each names its consumer — no endpoint without one.

### 5.1 `GET /health`
**Consumer:** CI, local dev. → `200 { "status": "ok", "qrp_version": str, "schema_version": str }`.

### 5.2 `POST /api/v1/circuits/analyze` — Flow A step `analyze`
**Request** `{ workload: QuantumWorkload, seed?: int }`
**Response** `{ circuit_profile: CircuitProfile }`
Real parse, real structural metrics; computes `circuit_fingerprint` (§31). Input caps and safety per
RECON-31; rejections use `413`/`422` with the §43 envelope.

### 5.3 `GET /api/v1/backends` — Flow A step `hardware`
**Query** `provider_id?`, `adapter_status?`, `limit`, `cursor`
**Response** `{ items: HardwareProfile[], next_cursor: str | null }`
Adapters that are not implemented report `adapter_status: "planned"` and are never presented as live
(§13, §71).

### 5.4 `GET /api/v1/backends/{backend_id}`
**Consumer:** Hardware Profiler (§20). → `{ hardware_profile: HardwareProfile }`. Unavailable device
fields are `null` ("Not provided"), never `0`.

### 5.5 `GET /api/v1/backends/{backend_id}/calibration`
**Query** `history?: bool` (default `false`), `limit`
**Response** `{ latest: CalibrationSnapshot, history?: CalibrationSnapshot[] }`
**Consumer:** Flow A step `hardware`; Calibration Drift Monitor (§21, Flow C). The `validity` block
carries `state`, `thresholds_ref` and its `drift_findings` — thresholds are configuration and are shown
in the UI, not hidden constants.

### 5.6 `POST /api/v1/strategies/generate` — Flow A step `strategies`
**Request** `{ circuit_profile, backend_id, calibration_snapshot_id, goal, seed? }`
**Response** `{ items: MitigationStrategy[], excluded: ExcludedStrategy[] }`
Driven by the machine-readable compatibility matrix (RECON-13). Incompatible techniques appear in
`excluded` with their `reason_codes` — *shown as excluded, never offered at zero benefit*. Specifically:
DD is excluded when `idle_exposure == 0` or the backend lacks delay scheduling; ZNE is excluded for
sampling tasks and for dynamic/mid-circuit-measurement circuits; twirling never appears as a standalone
item (it is `twirling_enabled` on ZNE/PEC); PEC appears with `executable: false`.

```python
class ExcludedStrategy(BaseModel):
    strategy_id: str
    display_name: str
    reason_codes: list[ReasonCode]
    explanation: str            # deterministic template
```

### 5.7 `POST /api/v1/strategies/optimize` — Flow A step `explore`
**Request** `{ circuit_profile, backend_ids: str[], goal, strategies?: MitigationStrategy[], seed? }`
**Response**

```json
{
  "plans": [ "ExecutionPlan …" ],
  "recommended_plan_id": "plan_… | null",
  "weights": { "…ScoreWeights" },
  "normalization_ref": "API_CONTRACT.md#normalization",
  "seed": 0
}
```

- **Two stages (RECON-19).** Stage A applies hard constraints — `max_cost_usd`, `target_error`,
  `max_runtime_seconds`, backend capability — and marks violators `infeasible` with `blocking` findings.
  Stage B scores **only** feasible candidates.
- Infeasible plans **are returned** (the UX shows the "closest infeasible option") but
  `recommended_plan_id` may never name one, and their `score` is `null` (invariant I-6).
- **Normalization ranges are fixed and documented, not per-batch min-max** (RECON-20), so a plan's score
  does not change because a different plan joined the batch.
- Ties break deterministically by lower `estimated_cost_usd`, flagged as `tie_break_applied`.
- `recommended_plan_id` is `null` when every candidate is infeasible — a legitimate answer.

<a id="normalization"></a>**Fixed normalization ranges (V1).** Each term maps to `[0,1]`, clamped:

| Term | Raw | Range | Direction |
|---|---|---|---|
| `error` | `rmse` (expectation_value) | `1e-4 … 1e-0`, log10 | lower is better |
| `cost` | `estimated_cost_usd` | `0 … goal.max_cost_usd` | lower is better |
| `time` | `estimated_qpu_seconds` | `0 … goal.max_runtime_seconds` | lower is better |
| `qubit_overhead` | physical qubits / logical qubits | `1 … 1000`, log10 | lower is better; `0` weight for QEM-only plans |
| `decoder_latency` | decoder latency vs budget | `0 … 1` ratio | lower is better; `0` weight for QEM-only plans |

**Preset weight vectors** (`priority`, §29, `w_error, w_cost, w_time, w_qubit_overhead, w_decoder_latency`):
`minimize_cost` = `0.25, 0.55, 0.20, 0, 0`; `balanced` = `0.40, 0.35, 0.25, 0, 0`;
`maximize_accuracy` = `0.70, 0.15, 0.15, 0, 0`; `custom` uses the caller's `weights` (must sum to 1.0).

### 5.8 `POST /api/v1/preflight` — Flow A step `decide`
**Request** `{ plan_id? , plan?: ExecutionPlan, goal, seed? }` (exactly one of `plan_id` / `plan`)
**Response**

```json
{
  "status": "RUN | RUN_WITH_WARNING | DO_NOT_RUN | INSUFFICIENT_DATA",
  "findings": [ "Finding …" ],
  "summary": "deterministic template sentence",
  "plan_id": "plan_…"
}
```

`status` is computed by `status_from(findings)` (§3) — it is never assigned directly. A `target_error` of
`1e-5` against QEM strategies yields `TARGET_ERROR_UNLIKELY` (RECON-11). `INSUFFICIENT_DATA` outranks
everything, including `DO_NOT_RUN`: not knowing is not the same as knowing it is bad.

### 5.9 `POST /api/v1/qec/simulate` — Flow B
**Request** `{ code: "repetition" | "surface_rotated", distance: 3|5|7, rounds?: int,
noise_model: "code_capacity" | "phenomenological" | "circuit_level", physical_error_rate: Quantity,
shots: int, decoder: "mwpm" | ..., seed: int }`
**Response**

```json
{
  "logical_error_rate": { "value": 0.031, "unit": "probability", "provenance": "simulated",
                          "method_ref": "QEC_METHODS.md#surface-mwpm" },
  "logical_error_rate_per_round": { "…Quantity" },
  "confidence_interval": { "level": 0.95, "interval": [0.027, 0.036], "method": "wilson",
                           "insufficient_statistics": false },
  "shots": 20000,
  "decoder_runtime_seconds": { "…Quantity" },
  "physical_qubit_estimate": 49,
  "logical_qubit_count": 1,
  "data_provenance": "simulated",
  "grid_status": "on_grid",
  "lineage": { "stim_version": "1.16.0", "pymatching_version": "2.4.0", "seed": 7 }
}
```

- **Pages cannot run Stim.** In the deployed demo this request is served from the precomputed seeded
  fixture grid in `demo-data/qec/`; a selection outside the grid returns `200` with
  `grid_status: "off_grid"`, `logical_error_rate: null`, and a message saying *"not in demo dataset"*.
  **Never interpolate** (RECON-15). Live sweeps require local-backend mode (`grid_status: "computed"`).
- `logical_error_rate_per_round` is required: **per-round normalization** is what makes the threshold plot
  correct (RECON-18).
- `data_provenance` is a **payload field**, not merely a badge (RECON-18).
- Decoders other than `mwpm` (and the repetition-code majority vote, if shipped) return `501` with
  `NOT_IMPLEMENTED` — declared, never faked (RECON-17).
- Surface-code MWPM uses `detector_error_model(decompose_errors=True)` (RECON-17).
- The repetition code is returned with `has_threshold: false` — it has no true threshold (RECON-18).

### 5.10 `POST /api/v1/qec/plan` — §25 Code Planner
**Request** `{ target_logical_error_rate: Quantity, logical_qubit_count: int,
physical_error_rate: Quantity, available_physical_qubits: int, connectivity_class: str,
max_decoder_latency_us: Quantity | null }`
**Response** `{ candidates: QECPlanCandidate[] }` — each with code family, parameters, estimated physical
qubits, estimated logical error rate, decoder, estimated decoder latency, feasibility and findings. Every
returned `Quantity` carries `provenance: "planning_estimate"`, and the UI labels it accordingly
(invariant I-10). A surfaced `target_error` of `1e-5` is legitimate **here** and only here (RECON-11).

### 5.11 `GET /api/v1/experiments` — Gap H
**Query** `circuit_fingerprint?`, `backend_id?`, `execution_mode?`, `limit`, `cursor`
**Response** `{ items: ExperimentRunSummary[], next_cursor }` — id, timestamps, backend, strategy id,
`execution_mode`, `processed_estimate`, `goal_result`.

### 5.12 `GET /api/v1/experiments/{run_id}`
**Response** `{ experiment_run: ExperimentRun }` — full lineage (§32).

### 5.13 `GET /api/v1/receipts/{receipt_id}` — Flow A step `receipt`
**Response** `{ receipt: ReliabilityReceipt }`. Also `GET …?format=json` for the download path; the
frontend exports the same bytes locally in demo mode (§19). No PDF endpoint — none is implemented (§71).

Every receipt carries `schema_version`, `qrp_version` and `execution_mode`, and
`actual_runtime_seconds` / `actual_cost_usd` are `null` whenever `execution_mode == "demo_replay"`
(RECON-8, invariant I-7).

### 5.14 `POST /api/v1/experiments` — **addition to §50, with a consumer**
§50 lists no way to *create* a run, yet Flow A step 8 requires one before a receipt can exist. Adding it
is the minimal fix; the alternative (a receipt endpoint that silently manufactures runs) would violate
§32 lineage.

**Request** `{ plan_id: str, execution_mode: ExecutionMode, shots?: int, seed: int }`
**Response** `201 { experiment_run: ExperimentRun, receipt_id: str }`

- `execution_mode: "hardware"` returns `501` in V1 — no browser-reachable path to a QPU exists, and none
  is faked (§13, §71).
- A plan whose strategy has `executable: false` (PEC) is rejected `422` with
  `MITIGATION_OVERHEAD_TOO_HIGH`-adjacent detail — PEC is a calculator in V1 (RECON-13, invariant I-11).

## 6. Versioning and compatibility

- **URL version** `/api/v1` changes only on a breaking change. Additive optional fields do not bump it.
- **`schema_version`** is carried inside receipts and `/health` and is bumped on any change to a
  persisted artifact's shape, so an old exported receipt stays interpretable (RECON-8).
- **`packages/contracts/` is regenerated in the same commit** as any schema change; CI fails on a stale
  diff.
- Adding an enum member (a new `ReasonCode`, a new strategy family) is **breaking for the frontend** —
  Zod enums are closed by design. Such changes ship with the contract regeneration and a frontend commit
  in the same PR.
