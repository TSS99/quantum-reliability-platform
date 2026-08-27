# ARCHITECTURE — Quantum Reliability Platform (QRP)

**What this document is.** The system view: how the pieces are laid out, which seams are load-bearing,
and which parts of the picture are *documented future work rather than code*. It deliberately does not
restate content that lives elsewhere:

| For | Read |
|---|---|
| What the product does, the four capabilities, Flow A | `PRODUCT_SPEC.md` |
| Object schemas, invariants, deterministic ids | `DOMAIN_MODEL.md` |
| Endpoints, wire format, reason codes, status precedence | `API_CONTRACT.md` |
| Tokens, primitives, theming rules | `DESIGN_SYSTEM.md` |
| IA, routes, journeys | `UX_MAP.md` |
| Frozen cross-owner decisions (RECON-1..32) | `PHASE1_RECONCILE.md` |
| Numbered architecture decisions | `DECISIONS.md` |
| What is built vs. what is left | `ROADMAP.md` |

Where this document and `PHASE1_RECONCILE.md` disagree, RECON wins.

---

## 1. Shape of the system

Two deployable things and one generated artifact between them:

```
                    ┌──────────────────────────────────────────┐
   browser ────────►│  apps/web  (React SPA, static)           │
                    │  components → ReliabilityDataSource ─┐   │
                    └──────────────────────────────────────┼───┘
                                                           │
                              ┌────────────────────────────┴───────────────┐
                              │                                            │
                   DemoReliabilityDataSource              ApiReliabilityDataSource
                   (seeded fixtures, no network)          (fetch → FastAPI)
                   powers the GitHub Pages build          powers a local/hosted run
                              │                                            │
                              └───────────► identical types ◄──────────────┘
                                       packages/contracts (GENERATED)
                                                  ▲
                                                  │ openapi.json
                                       ┌──────────┴──────────┐
                                       │ services/api        │
                                       │ FastAPI + Pydantic  │
                                       │ modular monolith    │
                                       └─────────────────────┘
```

The important property: **the UI cannot tell which data source it has**, beyond one `isDemo` flag it
uses to render the mandatory "Demo Data" transparency badge (MISSION §34). That is what makes a static
Pages deployment and a real backend run the same application rather than two forks.

### Why a modular monolith, not services

V1 has one writer, one workload, and no independent scaling axis. Splitting QEM, QEC, and the optimizer
into services would buy nothing and cost a contract per boundary. They are Python packages inside
`services/api/app` with clean interfaces instead, so extraction stays cheap if it is ever justified.

### Repository layout (as built)

```
qrp/
├── apps/web/              npm workspace — React + TS strict + Vite + Tailwind
│   ├── src/{app,components,features,pages,data,services,domain,hooks,utils,styles,assets}
│   ├── tests/             Vitest + React Testing Library (unit/component)
│   ├── e2e/               Playwright (owned by QA; excluded from the Vitest glob)
│   └── scripts/gen-tokens.py
├── packages/contracts/    npm workspace — GENERATED TS types + Zod schemas
├── services/api/          Python package — FastAPI app + pytest
│   └── app/{domain,schemas,...}
├── docs/                  specs, ADRs, and docs/data/*.json (design tokens, method tables)
└── .github/workflows/     ci.yml, pages.yml
```

Plain **npm workspaces** — no Nx/Turborepo (MISSION §8). Two workspaces do not need a build graph tool.
Python is intentionally *outside* the npm workspace set; the two toolchains meet only at the generated
contract and in CI.

---

## 2. Frontend (`apps/web`)

**Layering.** `pages/` compose `features/`, which compose `components/ui/` primitives. Data enters only
through `services/ReliabilityDataSource`. `domain/` holds mirrored types and the generated Zod
validators; `utils/` is leaf-level and imports nothing from the layers above it. The rule is one
direction: a primitive never imports a feature.

**Routing.** `app/createRouter.tsx` selects `createHashRouter` by default and `createBrowserRouter`
behind `VITE_ROUTER_MODE=browser`. GitHub Pages is a static host with no rewrite rule, so deep links
under a browser router 404 on refresh (RECON-25). The route *table* is shared; only the history strategy
differs, so the future move to a real host is one env var, not a fork. `vite.config.ts` reads
`VITE_BASE_PATH` so the `username.github.io/<repo>/` sub-path needs no code change (§48).

**Route table.** `app/nav.ts` is the single source of the 9-route IA (RECON-22) and carries an
`implemented: boolean` per route. Planned routes stay visible but render an honest "arrives later"
page — never a faked screen. This flag is how the shell stays truthful while the app is half-built.

**Theming.** `docs/data/design_tokens.json` is the token source of truth. `scripts/gen-tokens.py` emits
`src/styles/tokens.css` (CSS custom properties, dark-first with a light block at parity, RECON-27) and
`src/styles/tailwind-tokens.ts`, which `tailwind.config.ts` consumes. Components reference semantic
token names, never hex. Regenerate rather than edit the outputs.

**The data seam.** `services/ReliabilityDataSource.ts` is the only interface the UI is allowed to depend
on for platform data (MISSION §49). Today `DemoReliabilityDataSource` returns empty results rather than
inventing rows; seeded fixtures land with Phase 4 demo data, and `ApiReliabilityDataSource` lands with
the backend endpoints. Adding a network call anywhere else in the tree defeats the Pages deployment.

---

## 3. Backend (`services/api`)

FastAPI + Pydantic v2, Python ≥3.11, pytest. One process, layered by package:

| Package | Responsibility | State |
|---|---|---|
| `app/schemas/` | Pydantic wire models — the contract's authoritative definition | partial (quantity, common, circuit, hardware, workload) |
| `app/domain/` | Ids, invariants, reason codes — pure, no I/O | partial (ids, invariants, reason_codes) |
| `app/api/` | Routers; thin — validate, delegate, serialize | not started |
| `app/services/` | Use-case orchestration across domain + engines | not started |
| `app/qem/`, `app/qec/` | Scientific engines, owned by the respective scientists | not started |
| `app/optimization/` | Candidate generation, scoring, ranking | not started |
| `app/providers/` | `QuantumProviderAdapter` implementations | not started |
| `app/persistence/` | Experiment history | not started |
| `app/main.py` | App construction; currently `/health` only | skeleton |

**Determinism is architectural, not incidental.** `app/domain/ids.py` derives every id by hashing
canonical JSON of the input plus the seed — no clocks, no UUID4 (RECON-7). Same seed and same input
produce the same id across processes and machines, which is what makes fixtures, receipts, and lineage
reproducible. Any component that needs randomness takes an explicit seed.

**Invariants are shared, not per-feature.** `app/domain/invariants.py` holds I-1..I-12 (`DOMAIN_MODEL`
§4) as one validator, mirrored into Zod on the TypeScript side by the generator. Re-implementing a rule
per endpoint is how the two sides drift.

**Units.** Modelled and physical numbers travel as `{value, unit, provenance, method_ref}` (RECON-3,
ADR-0011); exact structural integers — qubit count, depth, gate counts, code distance, rounds, shots,
seed — stay plain integers. A bare float crossing the wire is a bug.

**Persistence.** In-memory first; SQLite only when persistent experiment history genuinely requires it
(MISSION §11). No PostgreSQL in V1. Nothing secret is ever stored.

**Providers.** Everything provider-specific sits behind `QuantumProviderAdapter`
(`list_backends`, `get_backend_profile`, `get_calibration`, `estimate_cost`, `validate_circuit`,
`execute`). `DemoProvider` is real; vendor adapters declare `status = planned` and are not faked. No
provider token ever reaches the browser (RECON-29).

---

## 4. The contract pipeline (RECON-1 / ADR-0001)

```
services/api/app/schemas/*.py   (Pydantic — AUTHORITATIVE, hand-written)
              │  FastAPI
              ▼
        openapi.json            (generated, committed)
              │  generator
              ▼
   packages/contracts/          (TS types + Zod schemas — generated, committed, never hand-edited)
              │
              ▼
        apps/web imports
```

One direction, one source. The wire is `snake_case` end to end (RECON-2) — the frontend does not
translate case, because a translation layer is exactly where a field silently goes missing. CI checks
the committed output for staleness, so a Pydantic change that was not regenerated fails the build
instead of reaching runtime. Generator wiring lands with the first real endpoints.

**Status and reason codes.** `Finding` and `ReasonCode` are defined once in `API_CONTRACT` §3, with a
single enum shared by both sides. Overall status is *computed* from finding severities via
`status_from()` — never hand-assigned by a feature (RECON-21).

---

## 5. Build, CI, deployment

- **CI** (`.github/workflows/ci.yml`) runs three independent jobs: `web` (typecheck → Vitest → build),
  `api` (ruff → pytest), and `security` (gitleaks, `npm audit`, `pip-audit`). Lockfiles are committed
  and `npm ci` is used, so builds are reproducible (RECON-32). Actions are pinned to tags today; pinning
  to commit SHAs is a tracked Phase-9 item.
- **Pages** (`pages.yml`) calls `ci.yml` first, then builds `apps/web` with `VITE_BASE_PATH` set and
  publishes. The deployed artifact is a pure static bundle: demo data source, no backend, no secrets,
  meta CSP (RECON-30).
- **Security posture.** Zero secrets in the repo or the bundle (RECON-29). The browser never holds a
  provider credential; anything requiring one is a backend concern.

---

## 6. Future architecture — DOCUMENTED, NOT IMPLEMENTED

Everything in this section is **out of scope for V1**. It is recorded so today's data model does not
foreclose it. No code in this repository implements any of it, and none should be added without a new ADR.

### 6.1 Edge QEC control plane (MISSION §55) — *future, not implemented*

Real-time quantum error correction cannot run in a cloud round trip: syndrome data arrives per
correction round at microsecond scale, so decoding has to sit next to the controller. The split is:

```
┌─ Cloud Reliability Control Plane ──────────────┐
│ config & experiment management · analytics     │
│ decoder selection · model training             │
│ observability · governance                     │
└───────────────┬────────────────────────────────┘
       policies ▼        ▲ telemetry
┌─ QEC Edge Agent ───────┴────────────────────────┐
│ syndrome streaming · low-latency decoding       │
│ feedback · real-time correction                 │
│ runs on CPU / GPU / FPGA                        │
└───────────────┬─────────────────────────────────┘
                ▼
        Decoder → QPU Controller → QPU
```

Cloud owns everything that can tolerate latency; edge owns everything that cannot. **No FPGA work is in
scope for this project** (MISSION §55, explicit). The only V1 obligation is that the QEC Lab's decoder
configuration is expressed as data (`DecoderConfig`) rather than hard-coded, so a policy-shaped object
could one day be shipped to an edge agent.

### 6.2 Universal QEC adapters (MISSION §56) — *future, not implemented*

A target where decoders are interchangeable behind one interface: Stim, PyMatching, CUDA-Q QEC,
Deltakit, IBM, Quantinuum, CustomDecoder. **V1 implements only what V1 needs** — the QEC Lab's
simulation path (see `QEC_V1_SIMULATION_PLAN.md`). The architectural obligation is narrow: keep decoder
choice a named, serializable config on the strategy object rather than a branch in engine code, so
adding an adapter later is an addition and not a rewrite.

### 6.3 The data moat (MISSION §57) — *future, not implemented*

```
circuit + hardware + calibration + noise + strategy + result + cost
        └────────────► historical reliability dataset
                              └────────────► prediction model
                                                  └────────► better strategy selection
```

**Do not implement production ML now.** The obligation this places on V1 is entirely in the data model,
and it is already met: every `ExperimentRun` records the full tuple above; deterministic circuit
fingerprints (RECON-7) let runs on the same circuit be joined across time; calibration snapshots are
versioned so a result can be tied to the hardware state that produced it; and receipts carry
`schema_version` + `qrp_version` + `execution_mode` (RECON-8) so a future training set can be filtered by
provenance instead of guessed at. V1's honest position is a *transparent heuristic* optimizer whose
reasoning is legible — which is also a better cold-start than a model with no data.

---

## 7. Known gaps between as-built and target

Stated plainly rather than implied by omission:

1. `packages/contracts` has a README and no generator yet — the pipeline in §4 is designed and agreed,
   not running. Until it runs, contract drift is caught by review, not by CI.
2. `services/api` is a health-check skeleton plus 5 of 9 schemas and the pure-domain modules. There is
   no `api/`, `services/`, `qem/`, `qec/`, `optimization/`, `providers/`, or `persistence/` package yet.
3. `DemoReliabilityDataSource` returns empty arrays. The Overview dashboard therefore has no rows, by
   choice — fixtures arrive in Phase 4 rather than placeholder data arriving now.
4. 8 of 9 routes are `implemented: false` and render the honest placeholder page.
5. V1 circuit fingerprints normalize *literally*: two circuits equivalent only under qubit relabeling or
   gate commutation get different fingerprints. This weakens cross-run joins in exactly the case §57
   would most like to exploit, and is a known, documented limitation rather than a defect.
6. CI actions are tag-pinned, not SHA-pinned (Phase 9, RECON-32).

`ROADMAP.md` tracks these against phases.
