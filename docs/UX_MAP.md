# UX Map — Information Architecture, Journeys, Screens, Rail & Primitives

**Status:** Phase-1 authoring. **Scope:** map and contracts only — no design system, no tokens, no
components. Those are Phase 2 (`DESIGN_SYSTEM.md`).

Governed by `PHASE1_RECONCILE.md` (RECON-1..32 are frozen; where `MISSION.md` differs, RECON wins).
This document owns **RECON-22** (IA), **RECON-23** (Rail), **RECON-24** (ExplainedScore) and
**RECON-27** (a11y/responsive). It consumes the Architect's `PRODUCT_SPEC.md` Flow-A step ids,
`DOMAIN_MODEL.md` and `API_CONTRACT.md` — it does not redefine them.

---

## 1. Information architecture (RECON-22)

Two surfaces, one bundle: the **public product site** (§15) and the **application** (§14). The router
is a HashRouter behind `createRouter()` (RECON-25), so every path below is base-path safe and Flow D
(§45) can walk them on a Pages-style prefix.

### 1.1 The contract

1. **Nine app routes. No tenth.** Adding a route requires a RECON amendment.
2. **Nav renders implemented routes only** (RECON-22, §71). A planned surface is *omitted* — not
   stubbed, not greyed out, not a "coming soon" card. There is no dead nav in this product.
3. **Decoder Lab is a panel inside QEC Lab, not a route** (RECON-22).
4. **Calibration is a tab on a hardware backend, not a route.** It has no meaning without a backend.
5. **A Receipt is a child of its run**, because a receipt without lineage is exactly the §71
   evidence-theatre failure.
6. Every route is reachable by keyboard alone and carries a unique, descriptive `<h1>`.

### 1.2 Route table

Landing is the public surface and is deliberately **not** a nav item — the product logo returns to it.

| # | Route | Nav group | Nav label | Purpose | V1 status |
|---|---|---|---|---|---|
| — | `/` | — (public) | — | Landing (§15): hero, problem, 4 capabilities, Rail in marketing mode, QEM→QEC continuum, platform-neutral adapter table, CTA. | Implemented |
| 1 | `/overview` | Plan | Overview | Dashboard (§14): Reliability Health, Active Hardware Profiles, Recent Runs, Calibration Drift, Cost Saved, Goal Pass Rate. Primary CTA enters Flow A. | Implemented |
| 2 | `/analysis/new/:step_id` | Plan | New Analysis | The product spine (§18). Focused task-flow shell mode with a persistent Rail. `:step_id` is one of the eight stable step ids, so back/forward and deep links work. | Implemented |
| 3 | `/workloads` · `/workloads/:workload_id` | Plan | Workloads | Example-circuit library (Bell, GHZ, VQE-like, QAOA-like, HW-efficient ansatz), each **with its observable** (RECON-14). List + detail; also the picker embedded in step `workload`. | Implemented — list + picker |
| 4 | `/hardware` · `/hardware/:backend_id` · `/hardware/:backend_id/calibration` | Hardware | Hardware | Backend list, then the profiler (§20) with two tabs: **Profile** and **Calibration** (§21 drift — the Flow-C surface). Unavailable fields render "Not provided", never `0`. | Implemented |
| 5 | `/strategies` | Reliability | Strategies | QEM Strategy Explorer (§22) driven by the machine-readable compatibility matrix (RECON-13). Maturity labels implemented/experimental/planned; PEC appears as an overhead calculator, not a runnable strategy. | Implemented |
| 6 | `/qec-lab` | Reliability | QEC Lab | §23–26. Code/distance/noise selection over the precomputed fixture grid (RECON-15), threshold plot (§24, RECON-18), Code Planner (§25), Readiness Score (§26), and the **Decoder panel** (§27, RECON-17). | Implemented |
| 7 | `/experiments` · `/experiments/:run_id` · `/experiments/:run_id/receipt` | Evidence | Experiments | Run list → lineage detail (§32) → **Reliability Receipt** (§19) with Print / Export JSON. | Implemented |
| 8 | `/integrations` | System | Integrations | Static adapter-status table (§13): category, technology, status ∈ demo support / adapter planned / integration implemented. No partnership claims, no logos. | Implemented — static table |
| 9 | `/settings` | System | Settings | Three controls only: drift thresholds (§21 — documented, not universal constants), unit/format preference, motion preference. | Implemented — 3 controls |

### 1.3 Nav grouping

```
Plan         Overview · New Analysis · Workloads
Hardware     Hardware              (→ backend → Profile | Calibration tabs)
Reliability  Strategies · QEC Lab  (→ Decoder panel)
Evidence     Experiments           (→ run → Receipt)
System       Integrations · Settings
```

Five groups, nine leaves. Below 768px the group labels become section headings inside a disclosure
drawer; the ordering never changes between breakpoints.

`?panel=decoder` on `/qec-lab` deep-links the Decoder panel open. It is a query parameter, not a
route: the panel shares QEC Lab's code and noise selection and is meaningless standing alone.

### 1.4 Explicitly not routes (so they are not re-added by accident)

Decoder Lab (panel) · Calibration (tab) · Reliability Receipts (child of a run) · Unified QEM/QEC
Decision (§28 — a panel on step `decide`) · QEC Code Planner (§25 — a panel in QEC Lab) · Pareto
Explorer (§18.6 — step `explore`) · Preflight (§30 — step `decide`).

Omitted from V1 entirely, with no placeholder: accounts/teams, alerting, billing, a provider
credentials console, API keys.

---

## 2. Primary journeys

### 2.1 Flow A — new analysis → receipt (the spine, and the E2E test of record)

Steps use the Architect's eight stable ids; the Rail regroups them visually (§4) without renaming
them.

| Step | Screen / region | Reads | On failure (§43) |
|---|---|---|---|
| `workload` | `/analysis/new/workload` — example picker (primary), paste OpenQASM, upload | `demo-data/` workloads + observables | Oversize/invalid input is rejected with a structured reason (RECON-31); the picker stays usable |
| `analyze` | same route, auto-advances | `POST /circuits/analyze` → `CircuitProfile` + fingerprint; circuit diagram | Parse/timeout errors name the offending construct; the prior selection is preserved |
| `goal` | Constraint band (§4.3) | presets Minimize Cost / Balanced / Maximize Accuracy / Custom | An out-of-range target error surfaces `TARGET_ERROR_UNLIKELY` guidance inline, before submit |
| `hardware` | Comparison matrix + coupling map | `GET /backends`, `GET /backends/{id}/calibration` | A stale snapshot shows `CALIBRATION_STALE` at its row, not as a page-level toast |
| `strategies` | Strategy list with compatibility verdicts | `POST /strategies/generate` | `incompatible` entries render with their `reason_code` — never hidden, never offered at zero benefit |
| `explore` | Pareto scatter (x = est. cost, y = est. error) | `POST /strategies/optimize` → ranked `ExecutionPlan[]` | Infeasible plans are **shown and labelled** as the "closest infeasible option" (RECON-19), never recommended |
| `decide` | Recommendation card + Preflight verdict + §28 unified-decision panel | `POST /preflight` → `PreflightVerdict` | `DO_NOT_RUN` / `INSUFFICIENT_DATA` are first-class outcomes with reason codes, not error screens |
| `receipt` | `/experiments/:run_id/receipt` | `POST /experiments` → `GET /receipts/{id}` | An export failure leaves the on-screen receipt intact and says the data is unchanged |

**Exit condition.** From the receipt alone a user can answer what ran, on what, under which strategy,
at what modelled cost, against which goal — and *whether any of it touched hardware*.
`execution_mode` (RECON-8) is displayed, not buried, and `actual_runtime` / `actual_cost` read
"Not applicable — demo replay" rather than being silently null.

**Entry points.** The landing CTA "Launch Reliability Lab" and the Overview primary CTA both land on
`/analysis/new/workload`. There is no third way in.

### 2.2 Flow B — QEC Lab

`/qec-lab` → select code (surface / repetition) → distance 3/5/7 → noise tier → physical error rate →
run → threshold plot (logical vs physical, log–log, per-round normalised per RECON-18) → optionally
open the Decoder panel and compare MWPM against the declared reference decoders.

Four obligations specific to this flow:

- **Off-grid selections say so.** A combination absent from the fixture grid (RECON-15) renders
  "not in the demo dataset" and names the nearest available point. Never interpolate silently.
- **Provenance is payload, not decoration.** `data_provenance: "simulated"` drives a persistent label
  on the plot itself, so a screenshot cannot lose it.
- **No single threshold number** is printed from three distances. The chart carries Wilson CIs and an
  insufficient-statistics flag, and the repetition code is labelled as having no true threshold.
- Decoder entries that are `NOT_IMPLEMENTED` (RECON-17) render as declared interfaces with **no**
  fabricated latency or logical-error numbers.

### 2.3 Flow C — calibration drift

`/hardware` → select backend → **Calibration** tab → historical plots for 2Q error, readout error,
T1 and T2 → validity state ∈ Stable / Watch / Stale / Significant Drift, each shown with the
threshold that produced it and a link to where that threshold is configured (`/settings`).

The stale state must be observable *without* interaction, because that is the Flow-C assertion: the
validity chip, its icon shape and its text label are all present on first render.

### 2.4 Flow D — route smoke test

Not a user journey; the route table (§1.2) is its specification. Every row, child routes included,
must resolve under a Pages-style base path with no 404 and no empty shell.

---

## 3. Screen inventory, prioritised

### 3.1 MVP — required for Flows A–D and the §70 questions

| Screen | Contains | Note |
|---|---|---|
| Landing | Hero + Rail (marketing mode), problem, 4 capabilities, 8-step sequence, QEM→QEC continuum, adapter categories, CTA | Uses the *same* Rail component as the app (RECON-23) |
| Overview | The six §14 widgets; every composite number via `ExplainedScore` | "Cost Saved" reframed as a modelled delta (RECON-28) |
| New Analysis (all 8 steps) | Rail in app mode + step panes | The spine; owns its own shell mode |
| Hardware list + profile | Overview block, metrics block, future-QEC block | "Not provided" for absent fields (§20) |
| Calibration tab | Four drift timelines + validity state | Flow C |
| Strategy Explorer | Matrix-driven strategy entries | Single source = the RECON-13 data file |
| QEC Lab | Selection form, threshold plot, Code Planner panel, Readiness Score, Decoder panel | Flow B |
| Experiments list | Run rows: fingerprint, backend, strategy, verdict | Entry to lineage |
| Receipt | All §19 fields + Print + Export JSON | No PDF unless actually implemented (§19) |

### 3.2 MVP, deliberately thin — the cuts

- **Workloads → list + picker.** No editor, no versioning, no tagging. The library is a read surface
  and a picker; authoring is out of V1 scope.
- **Integrations → static adapter table.** Categories and honest statuses (§13). No OAuth, no
  connection test, no credentials UI — that is a §44 / RECON-29 hazard for zero demo value.
- **Settings → three controls.** Drift thresholds, units/format, motion. Nothing else: every added
  toggle needs a consumer (§50's rule applied to UI).
- **Decoder Lab → panel.** One real decoder (MWPM) plus declared references.
- **Charts → six archetypes, reused everywhere:** timeline · Pareto scatter · log–log threshold ·
  heatmap · coupling-map graph · distribution/error-bar. This is the hardest cut and the one that
  protects the schedule: no bespoke per-page chart may be added without retiring one.

### 3.3 Later — not built, not stubbed, not in nav

Workload authoring/editing · saved comparisons · multi-run diffing · drift alerting · exportable PDF
reports · live provider connections · any account/team/billing surface · BP, BP-OSD, Union-Find and
GPU decoders as *executed* implementations.

### 3.4 State coverage (§43)

Every screen above ships four states — loading, success, empty, error — and error copy states what
failed, what remains safe, and what to do next. Two that are usually forgotten: the **empty** state
of Experiments must explain how to create a run (linking into Flow A), and an error on a computed
panel must leave already-fetched data on screen rather than blanking the page.

---

## 4. The Rail (RECON-23) — signature element spec

One component. Two modes. This is where the design boldness is spent (§38); everything around it
stays disciplined.

### 4.1 Modes

| | `mode="marketing"` | `mode="app"` |
|---|---|---|
| Where | Landing, "How it works" | New Analysis shell, persistent |
| Data | Static narrative fixture | Live Flow-A state |
| Advance | On scroll into view, one stage at a time, once | Driven by step progression |
| Interaction | A stage scrolls to its explanation | A stage navigates to its step, if reached |
| Stage state | All `complete`, revealed in sequence | `pending` · `active` · `complete` · `blocked` |

Both modes render identical stage geometry and labels. The marketing rail is not a separate
illustration — that duplication is precisely what RECON-23 exists to prevent.

### 4.2 Six visual stages ↔ eight step ids ↔ `ExecutionPlan`

```
Circuit  →  Hardware  →  Noise  →  Strategy  →  Execution  →  Verification
```

| Visual stage | Step id(s) | Domain object it displays |
|---|---|---|
| `circuit` | `workload`, `analyze` | `QuantumWorkload`, `CircuitProfile` → `ExecutionPlan.circuit_fingerprint` |
| `hardware` | `hardware` (backend half) | `HardwareProfile` → `ExecutionPlan.backend_id` |
| `noise` | `hardware` (calibration half) | `CalibrationSnapshot` → `ExecutionPlan.calibration_snapshot_id` |
| `strategy` | `strategies`, `explore` | `MitigationStrategy` → `ExecutionPlan.strategy`, `.reliability_estimate`, `.score` |
| `execution` | `decide` | `PreflightVerdict` + `ExecutionPlan.feasibility` / `.findings` |
| `verification` | `receipt` | `ExperimentRun` → `ReliabilityReceipt` |

**`goal` maps to no stage.** It is the *constraint band* (§4.3): the reliability goal bounds every
downstream stage rather than occupying one, and mapping it to a stage would drive the rail backwards
between steps 2 and 4.

**Invariants the implementation must satisfy**

1. **Monotonic.** `stageIndex(activeStage)` never decreases as step progression advances. Editing an
   earlier step resets later stages to `pending` in a single transition; it does not animate
   backwards through them.
2. **Total mapping.** Each of the eight step ids maps to exactly one stage or to the band. A new step
   id with no mapping is a build error, not a silently unrendered stage.
3. **No stage without data.** A stage renders `complete` only once its bound object exists. The Rail
   never asserts a transformation that has not happened — this is the §71 line for the signature
   element.
4. **`blocked` is a real state**, reserved for a stage whose step returned an infeasible or
   `DO_NOT_RUN` outcome, and distinguishable by icon shape and text — not by colour alone.

### 4.3 Constraint band

A single horizontal band rendered with the rail (below it at ≥768px, above the vertical stepper
below that) carrying the active `ReliabilityGoal` as chips: target error, confidence target, max
cost, max runtime, priority preset. While step `goal` is active the band is in edit state and the
rail holds its last completed stage. Chips a candidate plan violates are marked with the matching
code from the shared reason-code enum (RECON-21) — one visual language for constraint violation
across the whole product.

### 4.4 Motion and reduced motion (§40)

Stage transitions animate the *transformation itself* — a raw distribution visibly reshaping toward
a mitigated one along the rail — not decoration. No ambient or idle motion anywhere.

Under `prefers-reduced-motion: reduce` the Rail becomes a **static stepper carrying identical
semantics**: same six stages, same states, same labels, same bound values, transitions applied
instantly. It is not "the animation, disabled" — nothing may be conveyed by motion alone.

---

## 5. `ExplainedScore` (RECON-24) — the composite-number primitive

§26's "expose the formula" rule is hereby platform-wide: **no composite number is rendered anywhere
in this product except through `ExplainedScore`.** A number that cannot supply a breakdown is not
rendered as a score.

### 5.1 Contract

```ts
type Provenance = 'measured' | 'simulated' | 'heuristic' | 'demo_fixture' | 'planning_estimate';

interface ExplainedScoreTerm {
  name: string;          // human label, e.g. "2Q gate fidelity"
  raw: Quantity;         // { value, unit, provenance, method_ref } — RECON-3
  normalized: number;    // fixed documented range; NEVER per-batch min-max (RECON-20)
  weight: number;
  contribution: number;  // normalized * weight
}

interface ExplainedScoreProps {
  label: string;
  value: number | null;        // null renders "Not provided" — never 0 (§20)
  unit: string;
  provenance: Provenance;      // drives the always-visible badge (§33/§34)
  terms: ExplainedScoreTerm[]; // empty ⇒ the component refuses to render a value
  normalization_ref: string;   // doc anchor for the fixed ranges
  method_ref: string;
  explanation: string;         // template-generated from `terms`; never LLM prose (RECON-20)
  summary: string;             // required text alternative (RECON-27)
}
```

`ExplainedScoreTerm[]` is intentionally shape-compatible with `ScoreBreakdown.terms` and
`ScoreWeights` in `DOMAIN_MODEL.md`, so the optimizer's breakdown binds directly with no adapter.

### 5.2 Rules

1. The breakdown is reachable by keyboard and by pointer, and its content sits in the accessibility
   tree whether or not the popover is open.
2. The provenance badge is **always visible** — not inside the popover. A `heuristic` or
   `planning_estimate` number that looks measured is the §71 failure this primitive exists to stop.
3. `explanation` is generated deterministically from `terms` by template. Same inputs, same words.
4. Weights and normalisation ranges come from the same config the backend scores with. There is no
   second copy in the frontend.

### 5.3 V1 consumers

Reliability Health (§14) · Cost Saved, reframed as a modelled delta (RECON-28) · Goal Pass Rate
(§14) · QEC Readiness Score (§26) · the optimizer's `ScoreBreakdown` on step `explore` and in the
recommendation card. Any future composite number joins this list or is not shown.

---

## 6. Accessibility and responsive rules (RECON-27)

These are **acceptance criteria**, not aspirations: QA fails a screen that misses them.

### 6.1 Colour and status

- **Dark-first, light at parity.** Both themes are first-class from token day one; neither is a
  derived afterthought.
- **Seven semantic states exceed hue capacity** — healthy, warning, critical, uncertain, raw,
  mitigated, logical — especially under red-green deficiency. Therefore **status = icon shape + text
  label + colour, always. Never colour alone**, in any component, chart, badge or table cell.
- In charts, `raw` / `mitigated` / `logical` series are separated by **dash pattern and marker
  shape** first; hue is redundant reinforcement.
- Contrast: 4.5:1 for text, 3:1 for non-text and focus indicators — including muted metadata and
  thin chart strokes, where dark instrumentation palettes habitually fail. Checked automatically in
  CI (§47).

### 6.2 Charts

- **`summary` is a REQUIRED prop** on the chart wrapper. A chart cannot be constructed without a text
  alternative — cheap now, expensive to retrofit.
- Every chart offers a **"view as table"** toggle over the same data.
- Axis units and scale (notably log–log on the threshold plot) are labelled on the chart, not only in
  surrounding prose.

### 6.3 Responsive (breakpoints ~375 / 768 / 1024 / 1440)

- **Below 768px, table rows become definition-list cards.** Blanket `overflow-x` is forbidden (§41).
- **One exception:** genuinely matrix-shaped data — the hardware comparison at step `hardware` —
  keeps a horizontal scroll region *with* a sticky first column and a visible scroll affordance.
- The Rail is horizontal at ≥768px and a vertical stepper below it, with identical stages, states and
  labels.
- Nav collapses into a disclosure drawer below 768px; group order is invariant across breakpoints.

### 6.4 Structure and interaction

Semantic HTML; one `<h1>` per route with a correct heading hierarchy beneath it; visible focus
indicators on every interactive element; full keyboard operation including the Rail (arrow keys move
between stages, Enter activates a reached stage); ARIA only where semantics are otherwise absent;
accessible names on every control and icon-only button; live regions announcing step advancement and
verdict changes in Flow A.

---

## 7. Dependencies this map rests on

| Needs | From | Why |
|---|---|---|
| Stability of the eight step ids | Architect (`PRODUCT_SPEC.md`) | §4.2's mapping is a total function over them |
| Final `ScoreBreakdown` / `ScoreWeights` shape | Architect (`DOMAIN_MODEL.md`) | §5.1 binds `ExplainedScoreTerm` to it directly |
| Shared reason-code enum module | Architect + Optimizer (RECON-21) | §4.3 renders violations from it; no second copy in the UI |
| Fixture-grid manifest shape | QEC Sci (RECON-15) | §2.2's "not in the demo dataset" needs the grid's extent |
| Compatibility-matrix data file | QEM Sci (RECON-13) | Strategy Explorer and step `strategies` read it directly |

**Phase 2, not started per dispatch:** two compact design directions with written self-critique and a
selection (§35), tokens, the status-semantics system, component primitives, the chart wrapper, the
Rail's visual design and the responsive table rules — delivered as `DESIGN_SYSTEM.md`.
