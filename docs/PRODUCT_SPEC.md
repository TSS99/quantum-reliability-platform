# PRODUCT_SPEC — Quantum Reliability Platform (QRP), V1

**Status:** Phase-1 authored (Architect). **Governs:** what V1 promises and what it refuses to pretend.
**Precedence:** `PHASE1_RECONCILE.md` (RECON-1..32) > this file > `MISSION.md`. Mission sections cited `§N`.

---

## 1. The product in one paragraph

Existing quantum tooling exposes **mechanisms** — ZNE, PEC, dynamical decoupling, twirling, readout
mitigation, code choice, decoder choice. A user who wants a *result* has to become an error-mitigation
expert first. QRP is a **hardware-independent reliability control plane**: the user states an outcome
("estimate this observable to ±1e-2, under $40, in under 10 minutes"), and QRP returns a ranked set of
executable strategies, an explicit *run / do-not-run* verdict, and — after execution — an auditable
**Reliability Receipt** (§3; Gaps A/B/D/E).

V1 does not solve that optimization perfectly. V1 establishes the **architecture, data model, UX, and a
technically credible simulation/heuristic foundation**, and it is scrupulously honest about which parts
are real (§3, §71).

## 2. Users

| User | Wants | Primary capability |
|---|---|---|
| **Quantum application developer** | "Which backend + mitigation should I run, and is it worth it?" | C1 |
| **Research lead / reviewer** | "Prove this result was not cherry-picked." | C2 |
| **Hardware-facing engineer** | "Has this backend drifted since we tuned?" | C3 |
| **Architecture / roadmap planner** | "What does fault tolerance cost us at d=5?" | C4 |

The evaluator of this repository is a fifth, implicit user: every screen must survive the question
*"is this number real?"* (§34).

## 3. The four capabilities

The eight market gaps (§4) collapse into four shippable capabilities. Everything built in V1 traces to
one of them; anything that traces to none is out of scope.

### C1 — Reliability Planning (Gaps A, D, E)

**Problem.** Strategy choice is currently folklore. Mitigation overhead can exceed its benefit, and
nothing tells you before you spend the money.

**V1 surface.** The New Analysis flow (§18): circuit analysis → reliability goal → hardware candidates →
generated strategies → Pareto explorer → recommendation.

**Real.** Circuit parse and structural metrics. Strategy *generation* driven by the machine-readable
compatibility matrix (RECON-13). Two-stage optimizer: a hard-constraint pre-filter, then a weighted score
with a per-term contribution breakdown (RECON-19/20). Preflight verdict with structured reason codes
(RECON-21).

**Modeled / heuristic.** Error and cost *estimates*. `bias_estimate` is heuristic, `stat_std` is
computable, and they combine as `RMSE = sqrt(bias² + std²)` — a scalar "expected error" is forbidden
(RECON-12). Cost comes from a config table (§52), never scraped.

**Not in V1.** PEC as an *executed* strategy — it ships as an overhead/feasibility calculator only,
labeled `planning_estimate` (RECON-13). Standalone twirling — it is a modifier flag on ZNE/PEC, not a
strategy of its own.

### C2 — Reliability Verification (Gaps B, H)

**Problem.** A mitigated number is unfalsifiable without its provenance.

**V1 surface.** The Reliability Receipt (§19) plus experiment history and lineage (§32).

**Real.** The receipt is a complete, exportable, deterministic artifact: run id, circuit fingerprint,
calibration snapshot id, strategy and parameters, shots, raw estimate, processed estimate, both
uncertainties, goal, goal result, warnings, and software versions.

**Honesty mechanism (the load-bearing part).** Every receipt carries `schema_version`, `qrp_version`, and
a mandatory `execution_mode ∈ {demo_replay, local_simulation, hardware}`; `actual_runtime_seconds` and
`actual_cost_usd` are **null unless `execution_mode != demo_replay`** (RECON-8). A demo receipt therefore
*cannot syntactically* claim a measured runtime or a measured cost.

**Not in V1.** PDF generation — JSON export and a print view only (§19). Cross-run meta-analysis.

### C3 — Hardware & Calibration Intelligence (Gap C)

**Problem.** Learned mitigation settings silently rot as the device drifts.

**V1 surface.** Hardware Profiler (§20) and Calibration Drift Monitor (§21).

**Real.** The drift state machine — Stable / Watch / Stale / Significant Drift — evaluated over a
deterministic seeded calibration history, with **thresholds that are configuration, documented and
displayed, not universal constants** (§21). Missing device fields render as "Not provided", never as `0`
(§20).

**Modeled.** The calibration history itself is a seeded fixture (`provenance: demo_fixture`).

**Not in V1.** Live provider calibration polling. Adapters other than `DemoProvider` declare
`status = planned` and are backend-only; `apps/web/**` is lint-blocked from importing `services/api/**`
(§13, RECON-29).

### C4 — QEC Lab & Planning (Gaps F, G)

**Problem.** QEM does not disappear when QEC arrives; teams need the bridge, not a fork in the road.

**V1 surface.** QEC Lab (§23–26), with the Decoder Lab as a **panel inside it, not a route**
(RECON-22), plus the Code Planner and the QEC Readiness Score.

**Real.** Stim + PyMatching + Sinter, exact-pinned and backend-only (RECON-16). Rotated surface code and
repetition code, d ∈ {3,5,7}, rounds = d, three noise tiers (code-capacity, phenomenological,
circuit-level). **MWPM is the only real decoder**; every other decoder is a declared `NOT_IMPLEMENTED`
reference entry, never a faked benchmark (RECON-17). Nothing is hand-rolled — no home-grown stabilizer
simulator, syndrome circuit, DEM, or matcher.

**Static-host constraint.** GitHub Pages cannot run Stim. The deployed demo serves a **precomputed seeded
fixture grid** in `demo-data/qec/` (2 codes × d ∈ {3,5,7} × 3 noise models × ~12 physical-error values,
summary rows only, ≤200KB, with a manifest of seeds and library versions). Off-grid selections say
*"not in demo dataset"* and never interpolate (RECON-15). Live sweeps require local-backend mode.

**Correctness commitments.** Per-round normalization on threshold plots; the repetition code labeled as
having **no true threshold**; Wilson confidence intervals with an insufficient-statistics flag; and never
a single threshold number extracted from three distances (RECON-18).

**Not in V1.** qLDPC, real-time decoding, executed logical QEM — architected for, not built (§55–57).

## 4. Flow A — the canonical end-to-end journey

Flow A is the spine of the product and the E2E test of record (§45): *landing → launch lab → select
example workload → set reliability goal → compare hardware → view strategies → select recommendation →
generate reliability receipt.*

Eight process steps with **stable ids**. UX owns the visual `Rail` and maps its 6 visual stages onto
these 8 ids (RECON-23); the ids below are the contract, so the Rail may regroup them without breaking
anything downstream.

| # | Step id | User does | Produces | Endpoint |
|---|---|---|---|---|
| 1 | `workload` | Picks an example, pastes OpenQASM, or uploads | `QuantumWorkload` | — (client) |
| 2 | `analyze` | — (automatic) | `CircuitProfile`, incl. fingerprint | `POST /circuits/analyze` |
| 3 | `goal` | Sets target error, confidence, max cost, max runtime, priority preset | `ReliabilityGoal` | — (client) |
| 4 | `hardware` | Compares demo backends | `HardwareProfile[]` + `CalibrationSnapshot[]` | `GET /backends`, `GET /backends/{id}/calibration` |
| 5 | `strategies` | — (automatic) | `MitigationStrategy[]` | `POST /strategies/generate` |
| 6 | `explore` | Reads the Pareto view (x = est. cost, y = est. error) | ranked `ExecutionPlan[]`, feasible and infeasible | `POST /strategies/optimize` |
| 7 | `decide` | Accepts the recommendation or overrides it | `PreflightVerdict` + chosen `ExecutionPlan` | `POST /preflight` |
| 8 | `receipt` | Runs (demo replay) and exports | `ExperimentRun` → `ReliabilityReceipt` | `GET /receipts/{id}` |

**Examples ship with an observable.** Bell and GHZ (and the VQE-/QAOA-like ansätze) are meaningless as
reliability examples without one — "error" is undefined without a measured quantity — so every example
workload carries its observable (RECON-14).

**Rules that make Flow A trustworthy**

- **No dead ends.** Every step has loading / success / empty / error states, and error copy says what
  failed, what stays safe, and what to do next (§43).
- **Infeasible is visible, never recommended.** Stage A marks candidates INFEASIBLE with reason codes
  *before* scoring; they are still returned so the UI can show the "closest infeasible option", but the
  optimizer may never recommend one (RECON-19, §46).
- **Do-not-run is prominent.** A `DO_NOT_RUN` verdict is the loudest element of step 7, with its reasons
  in plain language generated deterministically from the structured breakdown — never LLM prose
  (RECON-20, Gap E).
- **Everything is reproducible.** Same seed + same workload ⇒ same fingerprint, same ids, same ranking,
  same receipt, across reloads (RECON-7, §33).
- **Every composite number is inspectable.** Reliability Health, Cost Saved and QEC Readiness all render
  through one `ExplainedScore` primitive that exposes formula and weights (RECON-24, §26/§71).

## 5. Honesty rules (product-level, non-negotiable)

1. **Provenance is a payload field, not a badge.** Every reported quantity carries
   `provenance ∈ measured | simulated | heuristic | demo_fixture | planning_estimate` (RECON-3). Badges
   are rendered *from* it.
2. **`DEMO_VS_REAL.md` is generated** from those provenance fields, never hand-maintained (RECON-4).
3. **`target_error = 1e-5` is unreachable by QEM on NISQ.** Documentation examples use `1e-2…1e-3`; any
   surfaced `1e-5` is a labeled QEC planning estimate, and preflight returns `TARGET_ERROR_UNLIKELY`
   (RECON-11).
4. **"Cost Saved" is a modeled delta**, labeled as such — never implied as realized hardware savings
   (RECON-28).
5. **Nav renders implemented routes only.** Planned surfaces are omitted, not stubbed (RECON-22, §71).
6. **No analytics or telemetry** ships to Pages, preserving the "no sensitive data" claim (§48).
7. **QEC Readiness is a QRP construct**, never presented as a standardized industry metric (§71).

## 6. Non-goals for V1

Automatic full-stack strategy synthesis (§3's conceptual API is the direction, not the deliverable); real
QPU execution from the browser; live pricing (§52); vector/ML circuit retrieval (§31); PostgreSQL (§11);
microservice decomposition (§71); a permanent company name or brand (§2).

## 7. Acceptance criteria for this spec layer

- Every V1 feature traces to exactly one of C1–C4, and every C1–C4 claim traces to a RECON decision or a
  mission section.
- Flow A's eight step ids appear unchanged in `API_CONTRACT.md`, in the UX map, and in the Playwright
  Flow-A test.
- No capability description claims something the code does not do; each carries its explicit
  "Not in V1" line.
