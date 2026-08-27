# ROADMAP — Quantum Reliability Platform (QRP)

Where the build actually is, phase by phase, as of **2026-08-27**. Phases follow MISSION §60. This is a
status document, not a plan restatement: what each phase *contains* is in MISSION §60, what each
deliverable *says* is in the doc it names.

**Honesty rule.** "Done" here means the work is on `main` and its checks pass. A task dispatched to an
agent is *in flight*, not done, and is listed as such — including when the shared kanban still shows it
as `doing`.

---

## Status at a glance

| Phase | Title | State |
|---|---|---|
| 0 | Bootstrap | ✅ done |
| 1 | Product + scientific spec | ✅ done |
| 2 | Design system + app shell | ✅ done |
| 3 | Backend domain foundation | 🟡 partial — ~40% on `main` |
| 4 | Demo data + frontend core | ⬜ not started (blocked on 3) |
| 5 | QEM engine | 🟠 in flight — nothing landed |
| 6 | QEC Lab | 🟠 in flight — nothing landed |
| 7 | Unified optimizer | ⬜ not started (blocked on 3/5/6) |
| 8 | Reliability observability | ⬜ not started |
| 9 | Security + QA | ⬜ not started |
| 10 | Release | ⬜ not started |

---

## Done

### Phase 0 — Bootstrap ✅
Repo at `qrp/` (ADR-0001), git/Node/Python confirmed, model roster resolved (ADR-0002, ADR-0006,
ADR-0010), 11-agent roster with isolated worktrees, shared board, CI skeleton that parses.

### Phase 1 — Product + scientific spec ✅
Six independent spec reviews ran in parallel and were reconciled into
**`PHASE1_RECONCILE.md` (RECON-1..32, frozen)**, which governs where it differs from `MISSION.md`.
Deliverables on `main`: `PRODUCT_SPEC.md`, `DOMAIN_MODEL.md`, `API_CONTRACT.md`, `QEM_METHODS.md`,
`QEC_METHODS.md`, `QEC_V1_SIMULATION_PLAN.md`, `UX_MAP.md`, plus ADR-0011 (`Quantity` envelope scope)
and ADR-0012 (`POST /api/v1/experiments`).

*Carried forward:* ADR-0011 and ADR-0012 are still **Proposed**; they need an accept/reject before the
Phase-3 schemas that depend on them are called final.

### Phase 2 — Design system + app shell ✅
`DESIGN_SYSTEM.md` and `docs/data/design_tokens.json`; the token generator emitting `tokens.css` +
`tailwind-tokens.ts` (dark-first, light at parity, RECON-27); UI primitives (Button, Card, StatusBadge,
SeriesTag, ExplainedScore — RECON-24); the 9-route shell with theme toggle (RECON-22); Landing;
Overview; the Rail skeleton; and the `ReliabilityDataSource` seam. Build and tests green.

---

## In progress

### Phase 3 — Backend domain foundation 🟡 partial
**On `main`:** `Quantity` envelope, deterministic ids, the I-1..I-12 invariant validator, the reason-code
enum, and **5 of 9 schemas** (quantity, common, circuit, hardware, workload). Integrated from a salvaged
partial branch after the original worker was reaped.

**Remaining before Phase 3 closes:**
- the other 4 Flow-A schemas (calibration/noise, goal, strategy/plan, experiment + receipt)
- `app/api/` routers and `app/services/` orchestration — the app is still `/health` only
- the preflight model and the optimizer *interface* (not the heuristic — that is Phase 7)
- **the generated-contract pipeline** (RECON-1): `openapi.json` → `packages/contracts`, plus the CI
  staleness check. `packages/contracts` is currently a README and nothing else.
- pytest coverage for the above

### Phases 5 and 6 — QEM engine, QEC Lab 🟠 in flight, nothing landed
Both are dispatched and both are open on the kanban, but `services/api/app` contains no `qem/` or `qec/`
package: **zero code from either phase is on `main`.** They were started ahead of Phase 3 closing, which
is why neither has a schema layer to build against. Treat their kanban `doing` as "an agent is running",
not as progress.

---

## Not started

- **Phase 4 — Demo data + frontend core.** Blocked on Phase 3's schemas and on the deterministic
  fixtures under `demo-data/` (§33). Today `DemoReliabilityDataSource` returns empty arrays and 8 of 9
  routes render the honest placeholder page; this is the single largest gap between the deployed demo
  and the product described in `PRODUCT_SPEC.md`.
- **Phase 7 — Unified optimizer.** Needs 3, 5, and 6. The fixed normalization ranges and preset weight
  vectors are already written down (`API_CONTRACT` §5.7); the *fixed-not-per-batch* property (RECON-20)
  is non-negotiable when they are implemented.
- **Phase 8 — Reliability observability.** Experiment history, drift, receipts, run and strategy
  comparison. Needs persistence, which is deliberately deferred until a feature requires it (§11).
- **Phase 9 — Security + QA.** Independent audits, Playwright suites, responsive screenshots, a11y,
  Pages build test. Includes SHA-pinning CI actions (RECON-32) and the meta-CSP verification (RECON-30).
  P0/P1 block release.
- **Phase 10 — Release.** Bundle budget, Pages config, base-path/route/mobile/no-secret verification,
  release docs, final review.

---

## Documentation debt (MISSION §58)

Required before release; **not yet written**: `SCIENTIFIC_ASSUMPTIONS.md`, `DEMO_VS_REAL.md`,
`SECURITY.md`, `TEST_PLAN.md`, `DEPLOYMENT.md`, `CONTRIBUTING.md`, `LICENSE`, and a `README.md` that
answers the §58 questions (what QRP is, what works today, what is simulated, how to run and deploy).
`ARCHITECTURE.md`, `PRODUCT_SPEC.md`, `DOMAIN_MODEL.md`, `API_CONTRACT.md`, `DESIGN_SYSTEM.md`,
`QEM_METHODS.md`, `QEC_METHODS.md`, `DECISIONS.md` and this file exist.

---

## Risks that actually threaten the schedule

1. **The contract pipeline is designed but not running.** Every hour Phases 4–8 build against
   hand-mirrored types is an hour of drift that CI cannot catch. This is the highest-leverage remaining
   Phase-3 item.
2. **Phases 5 and 6 started before Phase 3 closed.** They have no strategy or plan schema to target, so
   their output risks needing rework against the final contract.
3. **Token budget.** The floor is throttled and three workers have already been reaped for spending
   without committing. Phases 4–8 are the expensive ones; commit-early discipline is the mitigation.
4. **Two proposed ADRs gate the schema layer** (see Phase 1, carried forward).
5. **Fingerprint normalization is literal** — circuits equivalent only under qubit relabeling or
   commutation get different fingerprints. It does not block V1, but it caps the value of the historical
   dataset described in `ARCHITECTURE.md` §6.3.

---

## Definition of done for V1 (MISSION §72)

Flow A works end to end against the real backend; the Pages demo runs the same UI on seeded fixtures
with the demo state visibly labelled; every number on screen carries units and provenance; receipts are
reproducible from seed + fingerprint; scientific claims are documented with their assumptions; and no
audit leaves a P0 or P1 open.
