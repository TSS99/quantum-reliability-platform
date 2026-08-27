# MASTER MISSION: BUILD THE QUANTUM RELIABILITY PLATFORM

> This is the canonical source of truth for the QRP build. It is the master mission handed to
> Michael (the orchestrator) and is the reference every agent reads. When a dispatch says
> "read docs/MISSION.md §N", it means the section below.

Orchestrator: **Michael** (Claude Opus, GOD agent of the Munder Difflin hive).
Working name: **Quantum Reliability Platform** — internal short name **QRP**.
Product name lives in central config so it can be renamed later without a repo-wide search.

The system should ultimately answer:

> Given a quantum workload, the available hardware, the current noise characteristics, the user's
> accuracy requirement, runtime constraint, and cost budget, what is the best reliability strategy
> to execute that workload, and can we provide evidence that the strategy actually improved the result?

Conceptual progression the platform spans:

Physical circuit → error suppression → error mitigation → error detection → error correction →
logical execution → optional logical error mitigation → verification → reliability report.

This is a **real software product architecture**, not a marketing mockup. The first public
deployment is a **static interactive product prototype on GitHub Pages**:

1. Frontend must work fully as a static Vite app.
2. GitHub Pages version uses deterministic demo data or local browser computation.
3. NO API keys, auth secrets, cloud credentials, QPU tokens, passwords, or confidential data in frontend code.
4. A genuine FastAPI backend is still designed and implemented in-repo for local dev / future deployment.
5. Frontend talks through an abstraction layer so the demo data provider can later be swapped for the real API without rewriting the UI.
6. Do NOT run a commercial SaaS backend from GitHub Pages.
7. Do NOT collect sensitive user info in the Pages prototype.

---

## 1. GOVERNING DEVELOPMENT PHILOSOPHY (all agents)

**Think before coding.** Inspect code + spec, understand interfaces, identify dependencies, define
acceptance criteria, find the smallest correct implementation. Low-impact ambiguity → make a
reasonable assumption and document it. Escalate to Michael only when the decision materially affects:
product scope, destructive operations, external expenditure, credentials, legal/licensing, major
architecture, or irreversible data changes. Do not ask Michael routine coding questions.

**Simplicity first.** Minimum architecture that correctly solves the current requirement. No
single-use abstractions, speculative enterprise features, unnecessary microservices, or premature
infrastructure (no Redis/Kafka/Kubernetes/GraphQL/WebSockets unless a concrete requirement demands
it). A future-ready interface is fine; premature infrastructure is not.

**Surgical changes.** Modify only files relevant to your assigned task. No refactoring unrelated
files, renaming unrelated components, reformatting the repo, replacing another agent's implementation
without coordination, deleting comments you don't understand, or casually changing dependencies. Every
changed line should be explainable by the active task.

**Goal-driven execution.** Every task has measurable success criteria. "Done" means: implemented,
compiled, linted, tested, visually inspected where applicable, acceptance criteria passed, no known
critical regression. Never report done just because code was written. Verify before reporting.

---

## 2. PROJECT NAME
Working name **Quantum Reliability Platform** / short name **QRP**. Keep it centralized in config.
Do not design a permanent company name.

## 3. PRODUCT VISION
QRP is a hardware-independent reliability control plane. Current frameworks expose *mechanisms*
(ZNE, PEC, dynamical decoupling, Pauli twirling, readout mitigation, decoder selection, QEC code
selection). QRP exposes an *outcome*: given target error, max cost, max runtime, available providers,
determine the reliability strategy. Conceptual future API:

```python
result = reliability.run(circuit=circuit, target_error=1e-5, max_cost=100, max_runtime_seconds=600)
```

The system may eventually choose Hardware + layout + shots + error suppression + QEM technique +
error detection + QEC code + decoder + logical mitigation automatically. MVP need not solve this
optimization perfectly — it must establish the architecture, UX, data model, and technically credible
simulation/heuristic foundation.

## 4. MARKET GAPS (everything traces to at least one)
- **Gap A — Cost vs accuracy optimization.** Compare strategies by expected error, confidence, shot
  count, estimated QPU time, estimated cost, mitigation overhead. Expose Pareto-optimal choices.
- **Gap B — Independent reliability verification.** Preserve raw result, mitigated result, config,
  calibration snapshot, statistical uncertainty, improvement, provider, backend, shots, cost, time →
  a human-readable **Reliability Receipt**.
- **Gap C — Calibration drift awareness.** Model/visualize gate-error drift, readout-error drift,
  T1/T2 changes, stale calibration, significant deviation events; decide whether learned settings
  need recalibration. MVP may use deterministic demo calibration history.
- **Gap D — Reliability SLO.** Users think in outcomes (target error ≤ X, confidence ≥ Y, max cost,
  max runtime). Optimizer evaluates strategies against these constraints.
- **Gap E — Preflight execution intelligence.** Before execution: should this run? on which backend?
  is mitigation worthwhile? will overhead exceed benefit? is calibration stale? is the goal feasible?
  Possible decision: DO NOT RUN with reasons. Must be visually prominent.
- **Gap F — QEM+QEC orchestration.** QEM does not disappear when QEC arrives. Support: QEM; error
  detection + QEM; QEC; QEC + logical QEM.
- **Gap G — QEC code + decoder selection.** workload + topology + physical noise + target logical
  error → QEC code + parameters + decoder + resource estimate. V1 builds enough real QEC to
  demonstrate the direction.
- **Gap H — Reliability observability.** The beginning of Datadog/Grafana/MLflow for quantum
  reliability. Track experiments over time; make comparison possible.

---

## 5. AGENT ROSTER (Michael creates before implementation; ~11 roles, isolated worktrees)
Resolve the exact locally available model identifier before spawning; prefer highest-capability.

- **AGENT 0 — Michael — Chief Orchestrator/PM.** Model: Claude Opus 5 (fallback GPT-5.6 Sol).
  Maintains mission, task DAG, blackboard; creates agents; allocates tasks; prevents duplication;
  resolves disagreements; enforces acceptance criteria; controls integration; approves merges to main;
  maintains architectural coherence; stops scope creep; prepares delivery. Spends tokens on judgment,
  orchestration, review — does not implement large feature areas unless necessary. Knows which agent
  owns every major directory.
- **AGENT 1 — Architect** (GPT-5.6 Sol / fb Claude Opus 5). Monorepo architecture, domain model,
  frontend/backend boundary, provider adapter interfaces, reliability strategy abstraction, data +
  API contracts, decision records, diagrams, avoiding premature complexity. Deliverables:
  docs/PRODUCT_SPEC.md, ARCHITECTURE.md, DOMAIN_MODEL.md, API_CONTRACT.md, DECISIONS.md. Not the
  primary FE/BE implementer.
- **AGENT 2 — QEM Scientist** (GPT-5.6 Sol / fb Claude Opus 5). Noise, ZNE, PEC, PEA, DD, Pauli
  twirling, randomized compiling, readout mitigation, symmetry verification, CDR, shot noise,
  uncertainty, sampling overhead; Qiskit, Mitiq. Defines the scientific model: circuit profiling, QEM
  strategy representation, mitigation overhead, estimated improvement, uncertainty, technique
  compatibility, preflight recommendations, cost/accuracy tradeoffs. Never invents fake physical
  formulas to impress the UI. Label heuristic/estimated/simulated/demo quantities. Never present
  fabricated demo values as real hardware measurements.
- **AGENT 3 — QEC Scientist** (Claude Opus 5 / alt GPT-5.6 Sol). Stabilizer formalism, repetition &
  surface codes, syndrome extraction, logical operators, code distance, logical error rate,
  threshold/pseudo-threshold, MWPM, belief propagation; Stim, PyMatching; circuit-level &
  phenomenological noise, leakage concepts, decoder latency, qLDPC awareness. Builds the QEC Lab
  foundation. V1: repetition code, surface-code-compatible architecture, distance 3/5/7, configurable
  physical error rate, syndrome simulation, MWPM/PyMatching path, logical error estimation, logical
  error curves, resource estimates, decoder benchmarking abstraction. No qLDPC from scratch in V1;
  architect for future code-family plugins.
- **AGENT 4 — UX Director** (Claude Opus 5 / fb Claude Sonnet 5). MANDATORY skills: Anthropic
  frontend-design, UI/UX Pro Max, accessibility. Information architecture, user journeys, UX, design
  system, typography, layout, dataviz hierarchy, dashboard architecture, mobile behavior, interaction
  model, empty/error/loading states, copy. Creates design direction before FE implementation. Visual
  style: scientific, trustworthy, technical, precise, advanced, calm, instrument-like. AVOID generic
  AI startup gradients, glowing purple cards, excess glassmorphism, meaningless 3D spheres, decorative
  quantum imagery, giant useless hero text, fake testimonials/logos, over-rounded cards, uniform
  visual weight. Feel like a precision scientific instrument, not a crypto landing page.
- **AGENT 5 — Frontend** (Claude Sonnet 5; Opus 5 for major arch/design review). React, TS, Vite,
  Tailwind, a11y, responsive, viz, testing, state, performance. Skills: frontend-design, UI/UX Pro
  Max, Superpowers, React/TS testing, accessibility. Implements the complete frontend. No fake
  buttons — a visible control does something meaningful unless explicitly marked disabled/coming-later.
- **AGENT 6 — Backend/Platform** (GPT-5.6 Sol / fb Claude Opus 5). Python, FastAPI, Pydantic, pytest,
  scientific Python, adapters; Qiskit, Mitiq where appropriate, Stim, PyMatching. API, domain
  services, QEM engine, QEC engine, preflight, optimizer, provider adapters, run lineage, local
  persistence, scientific tests. **Modular monolith — do NOT split into microservices.**
- **AGENT 7 — Optimizer/Data** (GPT-5.6 Terra / fb GPT-5.6 Sol). Strategy selection layer.
  Transparent deterministic heuristics first; no ML training yet. Inputs: circuit depth, 2Q gate
  count, observable count, shots, gate error, readout error, T1, T2, calibration age, provider, QEM
  strategy, QEC strategy, cost model, target error, latency budget. Outputs: expected error,
  uncertainty, shots, runtime, cost, confidence, feasibility, recommendation, reason. Produce
  explanations, not a black-box number. No speculative model infrastructure.
- **AGENT 8 — Security** (Claude Opus 5 / 2nd GPT-5.6 Sol). Dependency review, secret scanning,
  frontend secret safety, CORS, API validation, injection surfaces, file-upload safety, supply chain,
  GitHub Actions review, unsafe subprocess use, API-key architecture, tenant-isolation considerations,
  security headers. Uses Trail of Bits skills where relevant. Files findings; owner agents fix;
  Security re-verifies. Does not rewrite half the app.
- **AGENT 9 — QA** (GPT-5.6 Sol / fb Claude Sonnet 5). Vitest, RTL, pytest, Playwright, responsive,
  a11y, visual regression screenshots, broken routes, interaction tests, scientific sanity, integration,
  GitHub Pages path testing. Tries to break the app; does not merely confirm developer claims.
- **AGENT 10 — Release/DevOps** (Claude Sonnet 5). Repo bootstrap, dependency pinning, lint/format,
  CI, GitHub Actions, Vite GitHub Pages deploy, build reproducibility, README setup, env templates,
  release checklist. No production cloud infra in V1.
- **AGENT 11 — Visuals** (reasoning: GPT-5.6 Sol). **MUST NOT use Claude image generation.** All
  original raster image creation uses an OpenAI/ChatGPT image-generation capability in the environment.
  If none connected: write a precise brief to docs/image-prompts/, insert a clearly identified
  placeholder, inform Michael, do NOT substitute Claude imagery, do NOT pretend an asset exists.
  Programmatic SVG charts/diagrams/icons/circuit drawings are NOT generative imagery and may be
  generated in code. Use Lucide (or one consistent icon library) for UI icons.

## 6. MODEL ALLOCATION
Orchestration=Opus 5; System arch=GPT-5.6 Sol; Quantum science=GPT-5.6 Sol/Opus 5; Security=Opus 5;
Final review=GPT-5.6 Sol; UX arch=Opus 5; FE impl=Sonnet 5; BE impl=GPT-5.6 Sol; Optimizer=GPT-5.6
Terra; QA=GPT-5.6 Sol; Docs/release=Sonnet 5; Small repetitive fixes=Haiku 4.5 / GPT-5.5 Instant.
Don't waste Opus 5 on renaming/formatting/fixtures. Escalate ambiguous/consequential work to the
stronger model.

## 7. SKILLS POLICY
Inspect skill repos before installing (owner, README, activity, license, permissions, install script,
hooks, dependency mods). Prefer project-local installation.
- **A. Anthropic frontend-design** (anthropics/claude-code → plugins/frontend-design/skills/frontend-design/)
  for UX Director, Frontend, final visual review. Deliberate design, domain identity, distinctive
  typography, intentional layout, one memorable signature element, responsive, keyboard focus, reduced
  motion, design critique before implementation.
- **B. UI/UX Pro Max** (nextlevelbuilder/ui-ux-pro-max-skill) for UX Director + Frontend. Layout,
  palettes, typography, UX, charts, responsive, a11y, component patterns. Scientific usability > spectacle.
- **C. Superpowers** (obra/superpowers) for coding agents: brainstorming, plans, worktrees, TDD,
  parallel dev, systematic debugging, code review, verification. Do not run a second orchestration
  hierarchy — Michael remains top-level orchestrator; Superpowers is methodology inside tasks.
- **D. Karpathy principles** (universal, regardless of plugin): think before coding, simplicity first,
  surgical changes, goal-driven execution. Baked into this mission — do not depend solely on a plugin.
- **E. wshobson/agents** (optional, selective): js-ts, python-development, backend-development,
  unit-testing, tdd-workflows, comprehensive-review, security-scanning, accessibility-compliance,
  ci-cd-automation. Install only relevant pieces; avoid duplicate/conflicting skills.
- **F. Trail of Bits** (trailofbits/skills, selective): security review, code auditing, GitHub Actions
  security, second-opinion. Not smart-contract skills.

## 8. REPOSITORY ARCHITECTURE (one repo)
```
quantum-reliability-platform/
├── apps/web/            # src/{app,components,features,pages,data,services,domain,hooks,utils,styles,assets} + tests
├── services/api/        # app/{api,core,domain,services,qem,qec,optimization,providers,persistence,schemas} + tests
├── packages/contracts/
├── demo-data/
├── docs/                # PRODUCT_SPEC, ARCHITECTURE, DOMAIN_MODEL, API_CONTRACT, DESIGN_SYSTEM, SCIENTIFIC_ASSUMPTIONS, DEMO_VS_REAL, DECISIONS, TEST_PLAN, image-prompts/
├── .github/workflows/
├── README.md  CONTRIBUTING.md  LICENSE
```
No Nx/Turborepo unless it clearly adds value; simple npm workspaces are acceptable.

## 9. FRONTEND STACK
React, TypeScript strict, Vite, Tailwind, React Router, TanStack Query only where useful, Zod runtime
schemas, Vitest, React Testing Library, Playwright. Charts: choose the minimum (Recharts / ECharts /
D3 — not all three). Icons: Lucide. No emoji as primary interface icons.

## 10. BACKEND STACK
Python, FastAPI, Pydantic, pytest, NumPy, SciPy where required. Quantum packages where justified:
Qiskit, Mitiq, Stim, PyMatching. Check compatibility before pinning; reproducible env; document
version choices. Don't install every quantum SDK. Provider-specific integrations behind adapters.

## 11. PERSISTENCE
Local V1: SQLite only if persistent experiment history is necessary; otherwise start in-memory and
add SQLite when required. No PostgreSQL in V1 unless a feature genuinely requires it. Frontend static
demo may store limited preferences in browser storage. Never store secrets.

## 12. CORE DOMAIN OBJECTS (Architect defines strongly-typed equivalents; no incompatible reps)
QuantumWorkload, CircuitProfile, HardwareProfile, CalibrationSnapshot, NoiseProfile, ReliabilityGoal,
MitigationStrategy, ErrorDetectionStrategy, QECStrategy, QECCode, DecoderConfig, ExecutionPlan,
CostEstimate, ReliabilityEstimate, ExperimentRun, MitigationResult, QECResult, ReliabilityReceipt,
ProviderBackend, DriftEvent.

## 13. PROVIDER ABSTRACTION
`QuantumProviderAdapter`: list_backends, get_backend_profile, get_calibration, estimate_cost,
validate_circuit, execute. Initial adapters: DemoProvider (used by Pages), IBM/IQM/Rigetti/IonQ/
Quantinuum placeholders. No real provider tokens in the browser. Non-implemented adapters declare
`status = planned`. Do not fake live integrations.

## 14–18. WEB APP IA & DASHBOARD
Two surfaces: (1) public product site, (2) interactive product application/demo.
App shell nav: Overview, New Analysis, Workloads, Hardware, Strategies, QEC Lab, Decoder Lab,
Experiments, Reliability Receipts, Calibration, Integrations, Settings. Collapse on small screens.
Overview dashboard widgets: Reliability Health (composite demo score, explained, not universal truth),
Active Hardware Profiles (IBM/IQM/Rigetti-like superconducting demo, ion-trap demo — no live claims),
Recent Runs, Calibration Drift, Cost Saved (labeled simulated/demo), Reliability Goal Pass Rate.

## 15. PUBLIC LANDING PAGE
Hero (product in one sentence; meaningful interactive scientific visualization, not particles;
CTA "Launch Reliability Lab" / secondary "Explore the workflow"), Product Problem, Four core
capabilities (Preflight Intelligence, Reliability Optimizer, QEM+QEC Planning, Reliability
Observability), How it works (real 8-step sequence), QEM+QEC continuum (Suppression → Mitigation →
Detection → Correction → Fault tolerance), Platform-neutral layer (categories; distinguish demo
support / adapter planned / integration implemented; no partnership claims), Final CTA. No fake
testimonials or enterprise logos.

## 18. NEW ANALYSIS WORKFLOW (one of the most important parts)
Step 1 Workload (use example / paste OpenQASM / upload; examples primary in static demo: Bell, GHZ,
small VQE-like, QAOA-like, random hardware-efficient ansatz). Step 2 Circuit Analysis (qubits, depth,
gate count, 2Q gate count, measurement count, idle exposure, connectivity, observable count, dynamic
circuits; visualize circuit). Step 3 Reliability Goal (target error, confidence target, max cost, max
runtime, priority; presets Minimize Cost / Balanced / Maximize Accuracy / Custom). Step 4 Hardware
Candidates (compare demo backends: qubit count, 2Q error, readout error, T1, T2, topology, calibration
age, est queue/runtime, est cost). Step 5 Strategy Generation (Raw, Readout Mitigation, DD+Readout,
Twirling+Readout, ZNE, DD+ZNE, PEC where feasible; no nonsensical combos; QEM Scientist approves
compatibility matrix). Step 6 Pareto Explorer (X=est cost, Y=est error; encode runtime/strategy/
feasibility; highlight Pareto-efficient). Step 7 Recommendation (RECOMMENDED or DO NOT RUN, plain
reasoning). Step 8 Reliability Receipt (after demo execution).

## 19. RELIABILITY RECEIPT (core differentiator)
Run ID, timestamp, circuit fingerprint, backend, calibration snapshot ID, strategy + params, shots,
raw estimate, processed estimate, uncertainty, est/actual runtime, est/actual cost, improvement, goal,
goal result, warnings, reproducibility metadata. Allow Print / Export JSON / Export report. Static
frontend may export JSON locally. Do not fake PDF generation unless implemented.

## 20. HARDWARE PROFILER
Overview (provider, backend, technology, qubits, connectivity, last calibration, QEC capability
status). Metrics (T1, T2, 1Q error, 2Q error, readout error, measurement time, reset capability,
dynamic circuits). Future-QEC fields (mid-circuit measurement, measurement/reset/feed-forward latency,
leakage estimate, decoder latency budget, syndrome cycle estimate, classical bandwidth). Render
unavailable data honestly as "Not provided", not zero.

## 21. CALIBRATION DRIFT MONITOR
Historical plots for 2Q error, readout error, T1, T2. Calibration Validity states: Stable / Watch /
Stale / Significant Drift, with explanations. Thresholds configurable and documented — not universal
constants.

## 22. QEM STRATEGY EXPLORER
Per strategy: name, category, requirements, strengths, limitations, sampling overhead, compatible/
incompatible workloads, parameters. Techniques: readout mitigation, DD, Pauli twirling, ZNE, PEC, CDR,
PEA, symmetry verification, post-selection. Maturity labels: implemented / experimental / planned.

## 23–27. QEC LAB (genuine technical part)
Code: Repetition, Surface (scope decided by QEC Scientist using reliable libraries — use Stim if it's
the reliable path; do not ship a broken home-grown surface-code simulator for appearance). Distance
3/5/7. Noise: bit flip, depolarizing, measurement error, phenomenological, circuit-level where
supported. Physical error rate input. Trials/shots configurable. Decoder: MWPM/PyMatching first;
interface for BP, BP-OSD, Union Find, GPU, Custom without implementing unnecessarily. Output: logical
error rate, physical error rate, code distance, syndrome statistics, decoder runtime, physical qubit
estimate, logical qubits. **§24 Threshold viz:** Logical vs Physical error rate for d=3/5/7; correct
scientific labels; label "Simulated" prominently. **§25 QEC Code Planner:** inputs (target logical
error, logical qubits, physical error, available physical qubits, connectivity category, max decoder
latency) → candidate plans (code family, parameters, est physical qubits, est logical error, decoder,
est decoder latency, feasibility); transparent approximations, label "Planning estimate". **§26 QEC
Readiness Score:** explainable multidimensional (physical gate fidelity, measurement quality, reset,
dynamic-circuit, connectivity, leakage handling, classical feedback, decoder latency support). Expose
the formula/weighting if a number is shown.

## 27. DECODER LAB
Inputs: code, noise model, syndrome dataset, decoder. Results: logical error, decode latency,
throughput, memory, success rate. V1: one real decoder + clearly labeled reference/demo alternatives.
Do not fake benchmark results for algorithms not actually executed.

## 28. UNIFIED QEM/QEC DECISION
Candidate modes: QEM only, error detection + QEM, QEC memory, QEC + logical mitigation. Explain why
some modes are unavailable (e.g., demo hardware lacks mid-circuit measurement + feedback).

## 29. OPTIMIZER
Score = w_e·E + w_c·C + w_t·T + w_q·Q + w_l·L (E=expected error, C=norm cost, T=norm runtime,
Q=physical qubit overhead if QEC, L=decoder latency penalty if QEC). Use a more interpretable model if
available. Provide recommendation, candidate rankings, constraint violations, explanation. Constraints
override preference weights (e.g., cost > max ⇒ infeasible regardless of score).

## 30. PREFLIGHT ENGINE
Statuses: RUN / RUN WITH WARNING / DO NOT RUN / INSUFFICIENT DATA. Structured, machine-readable reason
codes: COST_EXCEEDED, TARGET_ERROR_UNLIKELY, CALIBRATION_STALE, MITIGATION_OVERHEAD_TOO_HIGH,
UNSUPPORTED_CIRCUIT_FEATURE, QEC_CAPABILITY_MISSING, INSUFFICIENT_CALIBRATION_DATA.

## 31. CIRCUIT FINGERPRINT
Deterministic fingerprint from normalized characteristics (qubits, depth, gate histogram, 2Q ratio,
measurement pattern, observable profile, connectivity, parameter count). Foundation for future
retrieval; no vector ML retrieval in V1 unless necessary.

## 32. EXPERIMENT LINEAGE
Every run retains input, circuit fingerprint, hardware snapshot, strategy, params, software versions,
result, uncertainty, cost, timing. Goal: reproducibility.

## 33. DEMO DATA POLICY
High-quality deterministic demo datasets, seeded generation. No data that changes every reload unless
intentional. Every demo value traceable to demo-data/ or a seeded simulator. Persistent "Demo Data"
badge/metadata where appropriate.

## 34. REAL VS DEMO TRANSPARENCY (mandatory)
docs/DEMO_VS_REAL.md classifies every major feature: Real implementation / Local simulation /
Heuristic / Static demo data / Planned integration. Never mislead an evaluator.

## 35–42. DESIGN, COLOR, TYPOGRAPHY, SIGNATURE, IMAGERY, MOTION, RESPONSIVE, A11Y
UX Director produces ≥2 compact directions and selects one after self-critique. Inspiration:
scientific instrumentation, quantum control systems, lab monitoring, oscilloscope precision, hardware
topology, error syndromes, signal/noise analysis — not imitating existing dashboards. Color: no generic
purple/blue AI gradients; intentional palette; WCAG-compliant contrast; distinct semantics for healthy/
warning/critical/uncertain/raw/mitigated/logical; never color alone. Typography: display + body + data/
technical (careful monospace for metrics, not everywhere). **Signature element: "Reliability
Transformation Rail"** — a circuit enters left and transforms through Circuit → Hardware → Noise →
Strategy → Execution → Verification. Spend design boldness here; keep surrounding UI disciplined.
Imagery: prefer real functional visualizations (coupling maps, error heatmaps, reliability curves,
Pareto fronts, circuit diagrams, syndrome lattices, calibration timelines). If a unique hero/conceptual
illustration is needed, use OpenAI/ChatGPT image generation — never Claude raster imagery; no stock
cryostat photos. Motion explains state transitions; respect prefers-reduced-motion; no constant ambient
motion. Responsive breakpoints ~375/768/1024/1440; tables degrade intelligently, not blanket horizontal
overflow. A11y (part of acceptance criteria): semantic HTML, keyboard nav, focus indicators, ARIA,
chart textual summaries, non-color status, accessible labels, contrast, reduced motion, heading
hierarchy.

## 43. ERROR STATES
Every meaningful async/computational operation: loading / success / empty / error. Error text explains
what failed, what stays safe, what the user can do next. Avoid bare "Something went wrong."

## 44. SECURITY REQUIREMENTS
Never commit API keys/tokens/passwords/private certs/provider credentials. Provide .env.example with
placeholders; ensure .env ignored. Frontend bundles contain zero secrets. Real QPU execution only via
backend/provider adapters. Validate uploaded/pasted circuit data; limit payload sizes. Do not execute
arbitrary user Python; no eval of user data; no unsafe dynamic OpenQASM execution. Review dependency
supply-chain risk.

## 45. TESTING STRATEGY
Backend pytest: schemas, strategy compatibility, optimizer constraints, preflight status, cost calc,
QEC simulation sanity, edge cases, deterministic demo generation. Frontend Vitest + RTL: forms,
navigation, state, filters, optimizer rendering, receipts, error states. E2E Playwright flows:
- Flow A: landing → launch lab → select example workload → set reliability goal → compare hardware →
  view strategies → select recommendation → generate reliability receipt.
- Flow B: QEC Lab → select code → distance 3/5/7 → change physical error → run simulation → view
  logical-error plot.
- Flow C: Calibration → select backend → inspect drift → observe stale warning.
- Flow D: verify all major nav routes on a GitHub Pages-style base path.

## 46. SCIENTIFIC TESTS (invariants, not "assert current output")
Zero-noise limit sensible; increasing physical error shouldn't magically improve logical error over
broad samples; more shots ≈ less sampling uncertainty where relevant; deterministic seeds reproduce;
impossible QEC configs rejected; mitigation overhead ≥ 0; cost ≥ 0; confidence ∈ valid probability;
infeasible strategy cannot be the recommendation.

## 47. CI PIPELINE (GitHub Actions)
frontend install/lint/typecheck/test/build, backend install/lint/test, security/dependency checks.
Deploy only after the frontend pipeline succeeds.

## 48. GITHUB PAGES DEPLOYMENT
Official Vite GitHub Pages pattern. Vite base path works for username.github.io/repository/. Workflow
builds and publishes the artifact. Test deep-route behavior; if BrowserRouter causes Pages 404s, use a
static-hosting-compatible strategy (e.g. HashRouter for the Pages prototype) without compromising the
future API architecture.

## 49. STATIC DEMO DATA ADAPTER
Frontend data access via `ReliabilityDataSource`. Implement `DemoReliabilityDataSource`; later
`ApiReliabilityDataSource`. Components must not import giant JSON fixtures directly — keep data access
separate.

## 50. BACKEND API (initial shape; Architect refines; no endpoint without a consumer)
GET /health; POST /api/v1/circuits/analyze; GET /api/v1/backends; GET /api/v1/backends/{id};
GET /api/v1/backends/{id}/calibration; POST /api/v1/preflight; POST /api/v1/strategies/generate;
POST /api/v1/strategies/optimize; POST /api/v1/qec/simulate; POST /api/v1/qec/plan;
GET /api/v1/experiments; GET /api/v1/experiments/{id}; GET /api/v1/receipts/{id}.

## 51. API CONTRACT
Versioned schemas. Agree snake_case vs camelCase, dates, units, probabilities, error values, money,
nullable fields, enum states. Document units explicitly: t1_us, t2_us, two_qubit_error_rate,
readout_error_rate, estimated_cost_usd, runtime_seconds. Avoid ambiguous error/time/cost.

## 52. COST MODEL
Config-based estimator. No live pricing scraping in V1. Model provider, pricing unit, shots, execution
time, minimum charge. Mark every estimate "Estimated". Future pricing adapters replace config.

## 53–54. QEM & QEC SCIENTIFIC MODELS (documented)
QEM per technique: technique, requirements, implementation, parameters, expected overhead, limitations,
supported circuit types, citation notes. UI never implies a technique always improves results;
mitigation can worsen variance; communicate uncertainty. QEC: code family, distance, noise model,
decoder, syndrome representation, logical observable, physical qubit assumptions, rounds, logical error
calculation. Do not hide approximations.

## 55–57. FUTURE ARCHITECTURE (document, don't implement)
Edge QEC: Cloud Reliability Control Plane → policies/telemetry → QEC Edge Agent → CPU/GPU/FPGA →
Decoder → QPU Controller → QPU. Cloud handles config/experiment mgmt/analytics/decoder selection/model
training/observability/governance; edge handles syndrome streaming/low-latency decoding/feedback/
real-time correction. No FPGA work in this project. Future universal QEC adapters: Stim, PyMatching,
CUDA-Q QEC, Deltakit, IBM, Quantinuum, CustomDecoder — implement only what V1 needs. Future data moat:
circuit + hardware + calibration + noise + strategy + result + cost → historical reliability dataset →
prediction model → better selection. Do NOT implement production ML now; preserve the data model for it.

## 58–59. DOCUMENTATION
Before release: README.md, docs/{PRODUCT_SPEC, ARCHITECTURE, DOMAIN_MODEL, API_CONTRACT, DESIGN_SYSTEM,
SCIENTIFIC_ASSUMPTIONS, QEM_METHODS, QEC_METHODS, DEMO_VS_REAL, SECURITY, TEST_PLAN, DEPLOYMENT,
ROADMAP, DECISIONS}.md. Keep docs useful, not 50 unread pages. README answers: what is QRP, why it
exists, what works today, what is simulated, how to run frontend/backend/tests, how to deploy the demo,
what is the architecture. Screenshots only after design stabilizes.

## 60. DEVELOPMENT PHASES (Michael organizes; don't ask approval per phase unless a genuine product decision)
- **Phase 0 Bootstrap:** inspect env; confirm git/Node/Python; determine models; create repo; install
  only necessary skills; init worktrees; create shared board; create initial docs; CI skeleton.
  Verify: FE hello build works, BE health test works, git clean, CI config parses.
- **Phase 1 Product+Scientific Spec:** Architect, QEM Sci, QEC Sci, UX Director, Optimizer research in
  parallel → PRODUCT_SPEC, DOMAIN_MODEL, SCIENTIFIC_ASSUMPTIONS, QEM_METHODS, QEC_METHODS, initial API
  contract, initial UX map. Michael reconciles conflicts. No major UI implementation until architecture
  is coherent.
- **Phase 2 Design System:** UX Director direction/typography/palette/spacing/components/charts/
  signature/responsive; Frontend creates design tokens, component primitives, app shell; QA a11y baseline.
- **Phase 3 Backend Domain Foundation:** Backend + scientists implement circuit profile schemas,
  hardware profile, calibration, reliability goal, strategy model, preflight model, optimizer interface,
  experiment model, receipt model. Tests first where appropriate.
- **Phase 4 Demo Data + Frontend Core:** landing, dashboard, new-analysis flow, hardware profiles,
  strategy comparison, calibration monitor. Deterministic fixtures.
- **Phase 5 QEM Engine:** readout mitigation representation, DD strategy, twirling, ZNE; PEC may begin
  as feasibility/overhead modeling. Don't overbuild.
- **Phase 6 QEC Lab:** repetition/surface-code simulation path, distance controls, noise controls,
  MWPM, logical error results, threshold viz, resource estimates. Backend tests mandatory.
- **Phase 7 Unified Optimizer:** integrate circuit/hardware/calibration/QEM/QEC/cost/SLO; transparent
  heuristic; candidate plans, feasibility, ranking, recommendation, reasoning.
- **Phase 8 Reliability Observability:** experiment history, calibration drift, receipts, run
  comparison, strategy comparison.
- **Phase 9 Security + QA:** independent audits (security, dependency, secret, a11y), unit/integration/
  Playwright, responsive screenshots, scientific sanity, GitHub Pages build test. P0/P1 block release;
  P2 resolved or documented waiver.
- **Phase 10 Release:** optimize bundle, configure Pages, deploy workflow, verify base path/routes/
  mobile/no-secrets, release docs. Michael final review.

## 61–68. PROCESS RULES
Parallelize independent work; never 3 FE agents editing App.tsx at once; each task declares file
ownership; same-file needs are sequenced. All agents communicate via hive/mailbox; completion messages
carry: TASK, STATUS, FILES CHANGED, TESTS RUN, ACCEPTANCE CRITERIA, KNOWN LIMITATIONS, DEPENDENCIES/
REQUESTS — concise, no 3000-word updates. Michael maintains the shared blackboard (current milestone,
active/blocked tasks, decisions, risks, upcoming integration points); only Michael changes shared
priorities; agents propose. Disagreement protocol: scientific correctness > UI convenience;
accessibility > UX convenience; security > convenience (unless Michael documents a justified tradeoff);
simplicity > elegant-but-complex. Code review: every significant feature gets Review A (spec) + Review B
(engineering quality: correct/simple/readable/tested/secure/maintainable); reviewers don't rewrite
stylistic preferences. No self-approval for critical areas (optimizer, security-sensitive code,
scientific QEC code, deployment config) — writer is not the only reviewer. Frontend visual review loop:
implement → run locally → screenshot → UX Director review → QA review → fix identified issues →
recapture → stop when criteria met (don't endlessly redesign). Image workflow: Visuals prepares
purpose/placement/aspect/subject/composition/style/lighting/palette/negative-constraints/empty-space,
uses an OpenAI/ChatGPT image model; Claude models must not generate final raster imagery; assets
web-optimized, stored locally, meaningfully named, alt text if informative (alt="" if decorative).

## 69–70. PERFORMANCE & UX QUALITY BAR
Fast first meaningful render, no massive image payloads, code splitting where useful, no unnecessary
animation libs, no huge JS deps for trivial functions; Lighthouse if practical; don't optimize
imaginary bottlenecks. A technical user should, within minutes, be able to answer: what the product
does; why it differs from just calling ZNE; what it analyzes; how cost influences mitigation; what
preflight means; how QEC fits; what is simulated; what real hardware integration would require; what
evidence the platform preserves; how this evolves into a commercial product. If the app can't answer
these through interaction and content, it is incomplete.

## 71. FORBIDDEN SHORTCUTS
Do not: build only a landing page; fake live QPU status; invent customer logos/partnerships/quantum-
advantage claims; claim simulated experiments as physical; put secrets in frontend; use random numbers
as scientific output without labeling; make every module a microservice; create dead navigation; leave
Lorem Ipsum / placeholder cards; use generic AI copy; "ten gradients and call it design"; let Claude
create raster imagery; silently ignore failed tests; comment out failing tests; disable TypeScript
strictness to make compilation pass; catch every exception and return success; use `any` everywhere;
present heuristic reliability scores as experimentally validated; claim QEC readiness as a standardized
industry metric; claim provider support that isn't implemented.

## 72. COMPLETION CRITERIA
Product (landing + interactive app complete, product story clear, QEM+QEC relationship clear); Frontend
(responsive, accessible, no broken routes, no dead controls, polished scientific design, Pages build
succeeds); QEM (strategy representation, comparison, preflight, cost/error tradeoff, documented
assumptions); QEC (working simulation path, distance controls, noise controls, decoder path, logical-
error viz, resource planning concept, documented assumptions); Reliability (SLO, optimizer,
recommendation, do-not-run, drift, receipt, lineage); Backend (FastAPI functional locally, tests pass,
clean schemas, no secrets, API documented); Quality (FE tests, BE tests, E2E flows, security review,
a11y review, scientific review all pass); Documentation (architecture, demo-vs-real, deployment,
roadmap); Deployment (Pages prototype deployed, README has final public link, no sensitive
functionality on Pages).

## 73. FINAL REVIEW BOARD
Before completion, Architect + QEM Sci + QEC Sci + UX Director + Security + QA each vote APPROVE /
APPROVE WITH MINOR ISSUES / BLOCK (BLOCK requires resolution). Michael then asks GPT-5.6 Sol for a
final independent holistic review (architecture, scientific credibility, product differentiation, code
quality, UI coherence, security, deployment). Resolve material findings.

## 74. FINAL DELIVERABLE
Concise executive summary: what was built; GitHub repo; Pages prototype location; how to run locally;
how to start backend; major implemented QEM features; major implemented QEC features; what is real vs
simulated; known limitations; recommended next commercial-development step. No agent-log dumps.

## 75. STARTING ACTIONS (Michael)
1) inspect providers/models; 2) create roster; 3) isolated worktrees; 4) install+validate mandatory
skills; 5) create shared blackboard; 6) assign Architect, QEM Sci, QEC Sci, UX Director, Optimizer,
Security to independently review this spec; 7) have them find contradictions, unnecessary complexity,
missing critical requirements, scientific risks; 8) reconcile; 9) create docs/PRODUCT_SPEC.md; 10)
create the dependency-aware implementation task graph; 11) begin execution. Do not start with a giant
App.tsx or a flashy landing page. Establish product, scientific, domain, and architectural foundations
first, then build. The target is the first credible prototype of a hardware-independent Quantum
Reliability Control Plane spanning error mitigation, error detection, and error correction.
