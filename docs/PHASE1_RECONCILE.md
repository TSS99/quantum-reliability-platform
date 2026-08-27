# Phase 1 Reconciliation — Frozen Scope & Decisions

Michael (god) consolidated the six independent Phase-1 spec reviews (Architect, QEM Sci, QEC Sci, UX
Director, Optimizer, Security — memos archived in `hive/agents/god/inbox/.done/`). These decisions are
**frozen** and are the source authors build from. They refine `docs/MISSION.md`; where they differ, this
file wins for V1. Cite as `RECON-N`.

## A. Contracts & API seam
- **RECON-1 — Backend Pydantic is authoritative.** Backend emits `openapi.json`; TS types + Zod schemas
  are **generated** from it into `packages/contracts/` (committed, CI staleness-checked). No hand-kept TS
  double of the domain. (Architect #1)
- **RECON-2 — Wire is `snake_case`**, identical shapes in `demo-data/` and the API, so the
  `DemoReliabilityDataSource`↔`ApiReliabilityDataSource` swap (§49) is byte-compatible. `camelCase` never
  crosses the seam. (Architect #2)
- **RECON-3 — Typed units & ranges.** Every numeric quantity crossing the API is
  `{ value, unit, provenance, method_ref }`. `provenance ∈ measured | simulated | heuristic |
  demo_fixture | planning_estimate`. Error rates/probabilities are `0–1` on the wire (percent only in the
  UI formatter); money `*_usd`; time `*_us` / `*_seconds`. §46 invariants (cost≥0, overhead≥0,
  confidence∈[0,1]) become ONE shared validator. (QEM #1, Architect #11, QEC)
- **RECON-4 — `DEMO_VS_REAL.md` is GENERATED** from the `provenance` fields, not hand-maintained.
  (QEM #1, Architect #13)
- **RECON-5 — npm workspaces span `apps/web` + `packages/contracts` only**; Python via `pyproject`. No
  Nx/Turborepo. (Architect #1, §8)

## B. Domain scope (apply §50's "no type without a consumer")
- **RECON-6 — Phase-1 domain model defines only the ~9 objects on the Flow-A path:** QuantumWorkload,
  CircuitProfile, HardwareProfile, CalibrationSnapshot, ReliabilityGoal, MitigationStrategy,
  ExecutionPlan (with CostEstimate, ReliabilityEstimate), ExperimentRun, ReliabilityReceipt. QEC*/
  Decoder*/DriftEvent land with their consumers in Phase 6/8. (Architect #6)
- **RECON-7 — Determinism:** all demo IDs (run_id, circuit fingerprint, calibration_snapshot_id) derive
  from `seed + fingerprint`, stable across reloads (§33). Specified in DOMAIN_MODEL.md. (Architect #9)
- **RECON-8 — Receipt carries `schema_version` + `qrp_version`** (the Gap-B evidence artifact), plus a
  mandatory `execution_mode ∈ { demo_replay | local_simulation | hardware }`; `actual_runtime` /
  `actual_cost` are nullable and only set when `execution_mode != demo_replay`. Kills a class of
  §34/§71 dishonesty. (Architect #3, #10)

## C. "Confidence" & error semantics (resolves Architect blocker A + QEM)
- **RECON-9 — Split confidence into two fields:** `statistical_confidence` (frequentist coverage on the
  sampling/shot-noise part only) and `strategy_confidence` (heuristic; the model's confidence in its own
  estimate). Never conflate. (QEM #2, Architect #12)
- **RECON-10 — `target_error` is absolute error on a normalized observable ⟨O⟩∈[-1,1].** Defined in
  API_CONTRACT. (QEM #3, Architect #11)
- **RECON-11 — `target_error=1e-5` is unreachable by QEM on NISQ.** Keep the §3 API sketch, but doc
  examples use `1e-2…1e-3`; any surfaced `1e-5` is a labeled QEC **planning estimate**, and preflight
  returns `TARGET_ERROR_UNLIKELY` for it. (QEM #3, Architect #5)

## D. QEM model (compatibility matrix is machine-readable data — single source for backend generator,
§22 Explorer, and tests)
- **RECON-12 — Estimate = `bias_estimate` (heuristic) + `stat_std` (computable), combined as
  `RMSE = sqrt(bias² + std²)`;** optimizer consumes RMSE, UI shows both. ZNE/PEC reduce bias while
  raising variance — a scalar "expected error" is forbidden. (QEM #2)
- **RECON-13 — Technique compatibility (3-valued: compatible / conditional(requires X) / incompatible
  (reason_code)):**
  - **Readout mitigation:** post-processing, near-universal; tensored/M3 only (no full 2^n past ~10q);
    variance inflation ≥1.
  - **Dynamical decoupling:** requires `idle_exposure>0` AND backend delay/scheduling support; else a
    no-op → excluded, not offered at zero benefit.
  - **Twirling / randomized compiling:** NOT a standalone strategy — a **modifier flag** that
    enables/stabilizes ZNE/PEC (it converts coherent→stochastic noise; standalone ≈ 0 improvement).
  - **ZNE:** expectation-value tasks only, not sampling; invalid for dynamic/mid-circuit-measurement
    circuits; V1 = digital gate folding only.
  - **DD+ZNE:** valid; DD re-inserted AFTER folding (documented ordering constraint).
  - **PEC:** NOT runnable in V1 → ships as an **overhead/feasibility calculator only** (labeled
    `planning_estimate`), never as an executed strategy. (QEM #4; resolves §60↔§18 conflict)
- **RECON-14 — Bell/GHZ examples must ship WITH an observable** (else "error" is undefined). (QEM #4)

## E. QEC model
- **RECON-15 — Pages cannot run Stim (static host).** V1 QEC Lab serves a **precomputed seeded fixture
  grid** in `demo-data/qec/` (2 codes × d∈{3,5,7} × 3 noise models × ~12 physical-error values, summary
  rows only, ≤200KB JSON) generated by a committed script through the real backend, with a manifest of
  seeds + library versions. Live sweeps only in local-backend mode. Off-grid UI selections say "not in
  demo dataset" — never silently interpolate. (QEC #1) **Needs Architect + Frontend to honor the
  fixture-grid contract.**
- **RECON-16 — Approve backend deps (backend-only, never bundled, exact-pinned):** `stim==1.16.0`,
  `pymatching==2.4.0`, `sinter==1.16.0` (Apache-2.0, pure wheels, py3.11). Record
  `stim_version`/`pymatching_version` in lineage. Hand-roll nothing (stabilizer sim, syndrome circuits,
  DEM, matching). Keep the rotated **surface code** (one generator call) + repetition code, d=3/5/7,
  rounds=d, noise tiers code-capacity/phenomenological/circuit-level. (QEC #2, #3)
- **RECON-17 — MWPM (PyMatching) is the only REAL decoder;** BP/BP-OSD/UnionFind/GPU are
  `NOT_IMPLEMENTED` reference entries (declared, never faked). Optional 2nd real decoder = repetition-code
  majority-vote (honest comparison). Surface-code MWPM MUST use
  `detector_error_model(decompose_errors=True)`. (QEC #4)
- **RECON-18 — Threshold viz correctness:** per-round normalization is required (the likely bug);
  repetition code has NO true threshold (label accordingly); Wilson CIs + insufficient-statistics flag;
  never print a single threshold number from 3 distances; `data_provenance:"simulated"` is a payload
  field, not just a badge. (QEC)

## F. Optimizer & Preflight
- **RECON-19 — Two-stage pipeline.** Stage A hard-constraint pre-filter (max cost, target error, latency,
  hardware capability) marks INFEASIBLE with reason codes BEFORE scoring; Stage B scores only feasible
  candidates `Score = w_e·E + w_c·C + w_t·T + w_q·Q + w_l·L`. Infeasible candidates are returned (UX
  "closest infeasible option") but never recommended. (Optimizer #1)
- **RECON-20 — Interpretable scoring:** fixed documented normalization ranges (NOT per-batch min-max),
  per-term contribution breakdown alongside the total, deterministic epsilon tie-break (lower cost).
  Explanations are template-generated deterministically from the structured breakdown — never LLM prose.
  (Optimizer #2, #4)
- **RECON-21 — ONE shared reason-code enum** for Optimizer + Preflight (COST_EXCEEDED,
  TARGET_ERROR_UNLIKELY, CALIBRATION_STALE, MITIGATION_OVERHEAD_TOO_HIGH, UNSUPPORTED_CIRCUIT_FEATURE,
  QEC_CAPABILITY_MISSING, INSUFFICIENT_CALIBRATION_DATA). Status precedence:
  `INSUFFICIENT_DATA > DO_NOT_RUN > RUN_WITH_WARNING > RUN`. (Optimizer #3)

## G. Frontend / UX
- **RECON-22 — Adopt a 9-route IA** (from UX): nav renders IMPLEMENTED routes only; planned surfaces
  omitted, not stubbed (§71). Decoder Lab = panel inside QEC Lab; Workloads = list+picker; Integrations =
  static adapter table; Settings = 3 controls. (UX #1, Architect #8)
- **RECON-23 — ONE `Rail` component, two modes** (landing marketing + in-app), with an explicit
  stage↔ExecutionPlan mapping contract (6 visual stages ↔ the 8 process steps). Spend design boldness only
  here. (UX #2, #4)
- **RECON-24 — One `ExplainedScore` primitive** for every composite number (Reliability Health, Cost
  Saved, QEC Readiness): the formula/weights are always inspectable (§26/§71). (UX #3)
- **RECON-25 — Router:** HashRouter for Pages behind a one-file `createRouter()` factory; BrowserRouter
  behind a flag for a future real host. Decided now (Flow D depends on it). (Architect #4)
- **RECON-26 — Defer TanStack Query** until `ApiReliabilityDataSource` exists (premature over a static
  source). (Architect #7)
- **RECON-27 — Dark-first, light at parity.** 7 semantic states exceed hue capacity → pair color with
  icon/shape/text always; chart `summary` is a REQUIRED prop; tables below 768px become definition-list
  cards (no blanket overflow-x, §41). (UX A11y)
- **RECON-28 — Keep the "Cost Saved" widget, reframed** as a modeled/simulated delta, clearly labeled
  (never implied as real hardware savings). (UX #4)

## H. Security (bind from day one; deep audit Phase 9)
- **RECON-29** — Zero secrets in the bundle: `VITE_*` allowlist (app name, base path, demo flag only) +
  CI regex fail on `VITE_.*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)` + **post-build `dist/` secret scan**
  gating the Pages deploy. Real provider adapters are backend-only (ESLint `no-restricted-imports` blocks
  `apps/web/**` from `services/api/**`); DemoProvider is the only browser-reachable adapter.
- **RECON-30** — Meta CSP (Pages can't set headers): `default-src 'self'; script-src 'self';
  object-src 'none'; base-uri 'none'; frame-ancestors 'none'` (`style-src 'unsafe-inline'` acceptable,
  never for scripts). Ban `dangerouslySetInnerHTML`/`innerHTML`.
- **RECON-31** — OpenQASM/circuit input: treat as text (content-sniff), ~256KB cap, max qubits/gates/
  depth, parse under timeout/in a worker, structured §43 error on reject; no `eval`/`new Function`/
  dynamic import/`exec`/`pickle`; Zod at FE boundary mirrored by Pydantic server-side.
- **RECON-32** — CI: lockfiles + `npm ci`, Dependabot weekly, `npm audit --audit-level=high` +
  `pip-audit`, gitleaks + push-protection, SHA-pinned Actions, workflow `permissions: contents: read`
  (elevated only in deploy job), no `pull_request_target`.

## I. God's answers to the flagged questions
- **Repo public from day one: YES** (it's a public showcase; enables push-protection; no history to
  scrub since bootstrap). (Security Q1)
- **Analytics/telemetry on Pages: NO** — none, preserving the "no sensitive data" claim (§48).
  (Security Q2)
- **Meta-CSP: approved** as RECON-30. (Security Q3)
- **Nav: adopt the 9-route IA** (RECON-22); §14's 12-item list is NOT frozen. (UX Q1)
- **Decoder Lab: panel inside QEC Lab**, not a route. (UX Q2)
- **Dark-first, light at parity.** (UX Q3)
- **Cost Saved: keep, reframed** (RECON-28). (UX Q4)
- **QEC deps stim+pymatching+sinter: approved** (RECON-16). Pages fixture-grid: **approved**
  (RECON-15). (QEC decisions)
- **PEC in V1: overhead/feasibility calculator only** (RECON-13). (QEM Q4)

## Phase-1 authoring ownership (now UNBLOCKED)
- Architect → `PRODUCT_SPEC.md`, `DOMAIN_MODEL.md` (the 9 objects, RECON-3/6/7/8/9/10), `API_CONTRACT.md`
  (RECON-1/2/3/8/9/10/21).
- QEM Sci → `QEM_METHODS.md`, QEM half of `SCIENTIFIC_ASSUMPTIONS.md`, machine-readable compatibility
  matrix (RECON-12/13/14).
- QEC Sci → `QEC_METHODS.md`, QEC half of `SCIENTIFIC_ASSUMPTIONS.md`, `QEC_V1_SIMULATION_PLAN.md`,
  DEMO_VS_REAL QEC rows (RECON-15/16/17/18).
- UX Director → initial UX map (IA, journeys, prioritized screens) aligned to RECON-22/23/24/27.
- Optimizer's RECON-19/20/21 feed API_CONTRACT (Architect co-owns the reason-code enum module).
