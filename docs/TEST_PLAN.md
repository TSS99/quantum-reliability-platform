# Test Plan

The bar: **tests assert invariants, not current output.** A test that simply records what the code
happens to return today is worthless — it passes after the bug is introduced (MISSION §46).

## Layers

| Layer | Tool | Scope | Count |
|---|---|---|---|
| Backend unit + integration | `pytest` | schemas, invariants, IDs, QEM, QEC, optimizer, REST API | **140** |
| Frontend component | Vitest + RTL | shell, primitives, a11y baseline | **14** |
| End-to-end | Playwright (Chromium) | Flows A–D + regressions | **6** |
| Security | gitleaks, `npm audit`, `pip-audit` | secrets, dependency CVEs | CI |

Run them:

```bash
cd services/api && pytest -q
cd apps/web && npm run test && npm run e2e
```

## Scientific invariants (§46)

These are the tests that would catch a scientifically wrong build, not just a broken one:

- `rmse == sqrt(bias² + std²)` — the bias/variance split cannot be quietly collapsed to a scalar.
- **Sampling overhead is a multiplier ≥ 1.** (`>= 0` would pass a strategy claiming to need *fewer*
  shots than raw — a physical impossibility.)
- Cost ≥ 0; confidence ∈ [0, 1]; probabilities stay probabilities.
- **An infeasible plan can never be scored or recommended** — and a violated hard constraint can
  never be out-weighted (the optimizer's core guarantee).
- Preflight status follows the precedence `INSUFFICIENT_DATA > DO_NOT_RUN > RUN_WITH_WARNING > RUN`
  and is *computed*, never assigned.
- Score normalisation is stable across runs (fixed ranges, not per-batch min-max), so the same input
  yields the same score.
- Deterministic IDs: identical input ⇒ identical `run_id` / fingerprint / snapshot id.
- **A `demo_replay` receipt cannot carry `actual_runtime_seconds` or `actual_cost_usd`** — enforced
  as a schema invariant, so a demo result cannot syntactically claim to be a measurement.
- QEC: impossible configurations are rejected (e.g. even-distance surface codes), not silently run;
  `insufficient_statistics` is flagged rather than presented as a confident zero.

## E2E flows (§45)

| Flow | Asserts |
|---|---|
| **A** | landing → lab → New Analysis → change priority → a RUN / RUN-WITH-WARNING / DO-NOT-RUN verdict renders |
| **B** | QEC Lab → change noise model → threshold plot re-renders; "Simulated" badge present |
| **C** | Hardware → calibration drift visible with a non-stable validity state |
| **D** | all 9 routes reachable under the HashRouter base path |
| **Regression** | "Explore the workflow" scrolls **without** changing the route (an in-page `#anchor` would hijack the router hash — the original 404 bug) |

## Accessibility

Checked as acceptance criteria, not polish: every page exposes a heading; **every chart is
`role="img"` with a required text `summary`** (a non-visual user never meets a blank SVG); every
control has an accessible name; the target-error control is a labelled `slider`; semantic state is
carried by colour **+ icon + shape + text**, so a grayscale render loses no information.

## What is deliberately not tested

- **Visual regression snapshots.** Screenshots are captured for human design review
  (`SHOTS=1 npx playwright test shots.spec.ts`), not asserted — pixel diffs on an animated,
  glass-heavy UI would be noise, not signal.
- **Live provider integrations.** There are none to test; the adapters are declared, not implemented.
- **Load/performance testing.** No server is deployed; the prototype is static.

## Known gaps

- Playwright runs on Chromium only; no cross-browser matrix.
- The QEC endpoint test tolerates `503` so the suite passes on machines without `stim`/`pymatching`
  installed. On a machine with them, it asserts the real `422` rejection.
