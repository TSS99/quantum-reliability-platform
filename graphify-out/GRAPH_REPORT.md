# Graph Report - qrp  (2026-08-28)

## Corpus Check
- 145 files · ~75,662 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1242 nodes · 2276 edges · 100 communities (79 shown, 21 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.88)
- Token cost: 433,004 input · 0 output

## Community Hubs (Navigation)
- QEM Strategy Catalog
- API Contract & Agent Roles
- QEM Bias/Variance Model
- Frontend App Shell & Nav
- Optimizer Scoring & Findings
- Frontend Contract Types
- QEM/QEC Scientific Citations
- Architecture Decisions (ADRs)
- Domain Reason Codes & Schemas
- SVG Chart Primitives
- TypeScript Build Config
- Experiments & Receipt UI
- Cluster 12
- Cluster 13
- Cluster 14
- Cluster 15
- Cluster 16
- Cluster 17
- Cluster 18
- Cluster 19
- Cluster 20
- Cluster 21
- Cluster 22
- Cluster 23
- Cluster 24
- Cluster 25
- Cluster 26
- Cluster 27
- Cluster 28
- Cluster 29
- Cluster 30
- Cluster 31
- Cluster 32
- Cluster 33
- Cluster 34
- Cluster 35
- Cluster 36
- Cluster 37
- Cluster 38
- Cluster 39
- Cluster 40
- Cluster 41
- Cluster 42
- Cluster 43
- Cluster 44
- Cluster 45
- Cluster 46
- Cluster 47
- Cluster 48
- Cluster 49
- Cluster 50
- Cluster 51
- Cluster 52
- Cluster 53
- Cluster 54
- Cluster 55
- Cluster 56
- Cluster 57
- Cluster 58
- Cluster 59
- Cluster 60
- Cluster 61
- Cluster 62
- Cluster 63
- Cluster 64
- Cluster 65
- Cluster 66
- Cluster 67
- Cluster 68
- Cluster 69
- Cluster 70
- Cluster 71
- Cluster 72
- Cluster 73
- Cluster 80
- Cluster 81
- Cluster 82
- Cluster 83
- Cluster 84
- Cluster 85
- Cluster 86
- Cluster 87
- Cluster 89
- Cluster 91

## God Nodes (most connected - your core abstractions)
1. `QEC demo-data manifest (manifest.json)` - 25 edges
2. `evaluate()` - 25 edges
3. `context()` - 25 edges
4. `estimate()` - 24 edges
5. `optimize()` - 23 edges
6. `SimulationConfig` - 23 edges
7. `Quantity` - 22 edges
8. `run_simulation()` - 20 edges
9. `check_id_format()` - 18 edges
10. `ReliabilityGoal` - 17 edges

## Surprising Connections (you probably didn't know these)
- `apps/web (React+TS+Vite+Tailwind frontend)` --references--> `@qrp/web package.json`  [INFERRED]
  README.md → apps/web/package.json
- `New Analysis flow (Pareto explorer + two-stage optimizer)` --conceptually_related_to--> `Phase-5 strategy candidate generator output set`  [INFERRED]
  README.md → docs/data/qem_compatibility.json
- `QEC Lab (threshold plot feature)` --references--> `threshold_grid.json (216-row QEC threshold fixture)`  [INFERRED]
  README.md → demo-data/qec/threshold_grid.json
- `Declared-but-not-implemented decoders (majority_vote, bp, bp_osd, union_find, gpu_decoder, custom)` --semantically_similar_to--> `cdr (Clifford data regression, planned/not implemented)`  [INFERRED] [semantically similar]
  demo-data/qec/decoder_comparison.json → docs/data/qem_compatibility.json
- `QEC Lab (threshold plot feature)` --references--> `Stim + PyMatching (MWPM decoder) simulation toolchain`  [EXTRACTED]
  README.md → demo-data/qec/manifest.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **QRP monorepo build/type/format configuration** — qrp_package, apps_web_package, apps_web_tsconfig, tsconfig_base, prettierrc [EXTRACTED 1.00]
- **QEC V1 simulation fixture generation (script -> manifest -> data files, Stim/PyMatching)** — qec_generator_script, demo_data_qec_manifest, demo_data_qec_threshold_grid, demo_data_qec_decoder_comparison, qec_stim_pymatching [EXTRACTED 1.00]
- **QEM technique ordering/combination governance (ZNE, DD, readout, twirling)** — docs_data_qem_compatibility_zne, docs_data_qem_compatibility_dynamical_decoupling, docs_data_qem_compatibility_readout_mitigation, docs_data_qem_compatibility_pauli_twirling [EXTRACTED 1.00]
- **Flow A — The Nine Domain Objects** — docs_domain_model_quantumworkload, docs_domain_model_circuitprofile, docs_domain_model_hardwareprofile, docs_domain_model_calibrationsnapshot, docs_domain_model_reliabilitygoal, docs_domain_model_mitigationstrategy, docs_domain_model_executionplan, docs_domain_model_experimentrun, docs_domain_model_reliabilityreceipt [EXTRACTED 1.00]
- **Shared Cross-Cutting Contract Modules** — docs_domain_model_quantity, docs_api_contract_finding, docs_api_contract_reasoncode, docs_architecture_app_domain_invariants [EXTRACTED 1.00]
- **Model Allocation Decision Chain (ADR-0006..0010)** — docs_decisions_adr_0006, docs_decisions_adr_0007, docs_decisions_adr_0008, docs_decisions_adr_0009, docs_decisions_adr_0010 [EXTRACTED 1.00]
- **Reliability Receipt Evidence Chain** — docs_product_spec_reliability_receipt, docs_phase1_reconcile_recon8_execution_mode, docs_mission_experiment_lineage, docs_mission_gap_b_verification [EXTRACTED 0.90]
- **QEC Fixture Grid Production Pipeline** — docs_qec_methods_document, docs_qec_v1_simulation_plan_fixture_grid, docs_phase1_reconcile_recon15_fixture_grid, docs_qec_v1_simulation_plan_generator_script [EXTRACTED 0.90]
- **Optimizer/Preflight Constraint-Violation Flow** — docs_phase1_reconcile_recon19_two_stage_optimizer, docs_phase1_reconcile_recon21_reason_code_enum, docs_mission_preflight_engine, docs_ux_map_constraint_band [EXTRACTED 0.85]

## Communities (100 total, 21 thin omitted)

### Community 0 - "QEM Strategy Catalog"
Cohesion: 0.05
Nodes (80): fixture, Candidate, evaluate_all(), evaluate_strategy(), generate(), Any, The strategy catalog — which candidates exist, and which of them may be…, The candidate set for MISSION section 18 step 5: only the strategies that may… (+72 more)

### Community 1 - "API Contract & Agent Roles"
Cohesion: 0.06
Nodes (51): Optimizer / Data Engineer Agent, QEC Scientist Agent, Security & Adversarial Reviewer Agent, UX Director Agent, POST /circuits/analyze, GET /backends, GET /backends/{backend_id}/calibration, POST /experiments (+43 more)

### Community 2 - "QEM Bias/Variance Model"
Cohesion: 0.07
Nodes (47): bias(), combine_residuals(), ErrorBudget, estimate(), pec_gamma(), pec_gamma_squared(), The bias/variance reliability model (QEM_METHODS.md sections 2, 3, 5.7;…, 1 - exp(-sum r_c * E_c), the global depolarizing approximation with |<O>_ideal|… (+39 more)

### Community 3 - "Frontend App Shell & Nav"
Cohesion: 0.08
Nodes (31): Layout(), NAV_GROUPS, NavRoute, ROUTES, read(), Theme, useTheme(), Button (+23 more)

### Community 4 - "Optimizer Scoring & Findings"
Cohesion: 0.11
Nodes (41): Candidate, Finding, Quantity, ScoreBreakdown, Status precedence, computed — never hand-set: INSUFFICIENT_DATA > DO_NOT_RUN >…, status_from(), Candidate, _explain() (+33 more)

### Community 5 - "Frontend Contract Types"
Cohesion: 0.09
Nodes (34): AdapterStatus, CalibrationSnapshot, CircuitProfile, ExcludedStrategy, ExecutionMode, ExperimentRunSummary, Finding, MitigationStrategy (+26 more)

### Community 6 - "QEM/QEC Scientific Citations"
Cohesion: 0.08
Nodes (36): RECON-13 — QEM Technique Compatibility Matrix, Physical-Qubit Accounting (memory-patch counts), 1e-5 Honesty Rule, Bonet-Monroig et al., PRA 98, 062339 (2018), Bravyi et al., Mitigating measurement errors in multi-qubit experiments (PRA 2021), Cai et al., Quantum error mitigation, Rev. Mod. Phys. 95, 045005 (2023), Clifford Data Regression (CDR, planned), Strategy Combination Ordering Constraints (+28 more)

### Community 7 - "Architecture Decisions (ADRs)"
Cohesion: 0.08
Nodes (34): docs/ARCHITECTURE.md, ADR-0001 / RECON-1 (contracts are generated, not hand-edited), Generated TS types + Zod schemas (from OpenAPI), docs/DECISIONS.md, docs/DEPLOYMENT.md, QEM technique compatibility matrix (qem_compatibility.json), cdr (Clifford data regression, planned/not implemented), DD+ZNE re-insertion-after-fold ordering rule (RECON-13) (+26 more)

### Community 8 - "Domain Reason Codes & Schemas"
Cohesion: 0.13
Nodes (22): Finding, BaseModel, The ONE shared reason-code enum + status precedence (API_CONTRACT.md §3,…, CircuitProfile, BaseModel, `CircuitProfile` — what the circuit *is*, output of Flow-A step `analyze`…, Statistical vs strategy confidence — always two fields, never combined…, Frequentist coverage on the sampling / shot-noise part ONLY. (+14 more)

### Community 9 - "SVG Chart Primitives"
Cohesion: 0.14
Nodes (22): CouplingMap(), CouplingMapProps, MetricTimeline(), MetricTimelineProps, TimelinePoint, ParetoFront(), ParetoFrontProps, decades() (+14 more)

### Community 10 - "TypeScript Build Config"
Cohesion: 0.07
Nodes (28): apps/web tsconfig.json, compilerOptions, jsx, noEmit, types, extends, include, ../../tsconfig.base.json (+20 more)

### Community 11 - "Experiments & Receipt UI"
Cohesion: 0.13
Nodes (22): Card(), CardProps, Experiments(), receiptOf(), NewAnalysis(), PRESETS, STATUS, Overview() (+14 more)

### Community 12 - "Cluster 12"
Cohesion: 0.11
Nodes (26): RECON-16 — Approved QEC Backend Dependencies (stim/pymatching/sinter), RECON-18 — Threshold Visualization Correctness, Code Distance d in {3,5,7}, Detector Error Model (decompose_errors=True), execution_mode (demo_replay/local_simulation), Fowler, Mariantoni, Martinis, Cleland, Surface codes, PRA 86, 032324 (2012), Gidney, Stim: a fast stabilizer circuit simulator, Quantum 5, 497 (2021), Higgott & Gidney, Sparse Blossom (PyMatching 2), 2023 (+18 more)

### Community 13 - "Cluster 13"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-import, devDependencies, eslint, eslint-config-prettier, @eslint/js (+17 more)

### Community 14 - "Cluster 14"
Cohesion: 0.12
Nodes (23): calibration_snapshot_id(), canonical_json(), circuit_fingerprint(), plan_id(), Any, Deterministic id derivation (DOMAIN_MODEL.md §2, RECON-7). Same seed + same…, The example slug as-is, or wl_ + sha(source_text | seed)[:16] for…, Sorted keys, no whitespace, floats rounded to 12dp (repr(round(v, 12)) via… (+15 more)

### Community 15 - "Cluster 15"
Cohesion: 0.17
Nodes (24): calibration_metrics_kwargs(), calibration_snapshot_kwargs(), calibration_validity_kwargs(), circuit_profile_kwargs(), compatibility_kwargs(), cost_estimate_kwargs(), execution_plan_kwargs(), experiment_run_kwargs() (+16 more)

### Community 16 - "Cluster 16"
Cohesion: 0.12
Nodes (19): CountUp(), reduced(), Reveal(), RevealProps, useCountUp(), useReveal(), useTilt(), dotGlow (+11 more)

### Community 17 - "Cluster 17"
Cohesion: 0.16
Nodes (21): Circuit, DetectorErrorModel, Matching, SimulationConfig, build_circuit(), build_dem(), build_matcher(), §3: the noise tier is expressed purely through generator kwargs; no circuit… (+13 more)

### Community 18 - "Cluster 18"
Cohesion: 0.15
Nodes (22): post, analyze_circuit(), CandidateIn, CircuitAnalyzeRequest, get_backend(), get_calibration(), list_backends(), optimize_strategies() (+14 more)

### Community 19 - "Cluster 19"
Cohesion: 0.15
Nodes (18): ThresholdPlotProps, CODES, DISTANCES, NOISE, QecLab(), QecCode, QecNoiseModel, ThresholdGridFile (+10 more)

### Community 20 - "Cluster 20"
Cohesion: 0.12
Nodes (14): App(), appRoutes, PAGES, router, routes, createRouter(), RouterMode, Integrations() (+6 more)

### Community 21 - "Cluster 21"
Cohesion: 0.13
Nodes (17): check_observable_normalized(), Any, I-9: Observable.normalized => sum(|coefficient|) == 1 within 1e-9., ExecutionPlan, BaseModel, ReliabilityReceipt, Observable, PauliTerm (+9 more)

### Community 22 - "Cluster 22"
Cohesion: 0.16
Nodes (15): default_rounds(), QEC simulation configuration and its validation (QEC_METHODS.md §1-§3, §8.8).…, §1/§3: rounds = 1 for code-capacity (a documented rounds=1 proxy), otherwise…, §8.8: impossible configs are rejected with a structured reason code, never…, validate(), QecConfigError, Structured rejection for impossible QEC configurations (QEC_METHODS.md §8.8,…, Raised for a configuration QRP cannot simulate. Never returns a number (§27,… (+7 more)

### Community 23 - "Cluster 23"
Cohesion: 0.12
Nodes (17): RECON-21 — Shared Reason-Code Enum, RECON-22 — 9-Route IA, RECON-23 — One Rail Component, Two Modes, RECON-27 — Dark-First A11y & Responsive Rules, Flow A — Canonical End-to-End Journey (8 steps), Phase 9 QA & Security Audit Results, Shot Multiplier / Sampling Overhead, Accessibility Test Criteria (+9 more)

### Community 24 - "Cluster 24"
Cohesion: 0.13
Nodes (18): CalibrationPoint, CouplingEdge, Quantity, QuantumWorkload, QubitNode, BACKEND_SPECS, BackendSpec, buildBackend() (+10 more)

### Community 25 - "Cluster 25"
Cohesion: 0.13
Nodes (10): health(), get, QRP backend — FastAPI modular monolith (MISSION §10). Mounts the v1 REST…, _cand(), _goal(), The v1 REST surface: real engines behind real endpoints (MISSION §50)., §20: a value the demo device cannot report is null — reporting 0 would be a lie., test_optimize_ranks_and_excludes_over_budget() (+2 more)

### Community 26 - "Cluster 26"
Cohesion: 0.11
Nodes (18): QEC demo-data manifest (manifest.json), generated_at_utc, generator_git_sha, generator_script, master_seed, method_ref, numpy_version, plan_ref (+10 more)

### Community 27 - "Cluster 27"
Cohesion: 0.14
Nodes (16): Real vs Demo Transparency / DEMO_VS_REAL.md (§34), Core Domain Objects (§12), Forbidden Shortcuts (§71), QuantumProviderAdapter Abstraction (§13), RECON-29 — Zero Secrets in Bundle, RECON-30 — Meta Content Security Policy, RECON-31 — OpenQASM/Circuit Input Safety, RECON-3 — Typed Units & Provenance Envelope (+8 more)

### Community 28 - "Cluster 28"
Cohesion: 0.20
Nodes (16): per_round_rate(), Logical-error-rate statistics QRP owns and therefore tests (QEC_METHODS.md §6).…, §6.3: 95% Wilson score interval. Correct at k=0 and small P_L, where Wald is…, §6.2: invert the composition of `rounds` independent Bernoulli(p_round) flips.…, Both rates (§6.1, §6.2), both CIs (§6.3), and the honesty flags (§6.4)., summarize(), wilson_interval(), half_width() (+8 more)

### Community 29 - "Cluster 29"
Cohesion: 0.15
Nodes (13): check_infeasible_not_scored_or_recommended(), check_overhead_ratio(), check_rmse(), Shared invariants I-1..I-12 (DOMAIN_MODEL.md §4, §46). Implemented once here…, I-2: overhead/inflation ratios (sampling_overhead, variance_inflation) are >= 1., I-5: rmse == sqrt(bias^2 + std^2) within 1e-12., I-6: infeasible => score is None and is_recommended is False., model_validator (+5 more)

### Community 30 - "Cluster 30"
Cohesion: 0.16
Nodes (13): check_demo_replay_actuals_null(), check_expectation_value(), check_id_format(), check_strategy_executable_for_run(), I-7: execution_mode == 'demo_replay' => actual_runtime_seconds and…, I-8 (format half): id matches ^(cf|cal|plan|run|rcpt|wl)_[0-9a-f]{16}$. Re-…, I-11: a strategy with executable=False (PEC, RECON-13) may never back an…, I-1: unit `expectation_value` ⇒ [-1, 1] for an estimate of <O>, [0, 2] for an… (+5 more)

### Community 31 - "Cluster 31"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, @playwright/test, postcss, @testing-library/jest-dom, @testing-library/react, typescript, vite (+7 more)

### Community 32 - "Cluster 32"
Cohesion: 0.19
Nodes (12): 11-Agent Roster (Michael/Architect/QEM Sci/QEC Sci/UX/FE/BE/Optimizer/Security/QA/Release/Visuals), Circuit Fingerprint (§31), Cost Model (§52, config-based estimator), Development Phases 0-10 (§60), Experiment Lineage (§32), Future Edge-QEC Control Plane Architecture (§55-57), Gap E — Preflight Execution Intelligence, Gap F — QEM+QEC Orchestration (+4 more)

### Community 33 - "Cluster 33"
Cohesion: 0.19
Nodes (14): Gap A — Cost vs Accuracy Optimization, Gap D — Reliability SLO, Optimizer Score = w_e.E + w_c.C + w_t.T + w_q.Q + w_l.L (§29), RECON-12 — Bias+Variance Estimate Combination, RECON-19 — Two-Stage Optimizer Pipeline, RECON-20 — Interpretable Scoring (fixed ranges, template explanations), RECON-24 — ExplainedScore Primitive, C1 — Reliability Planning (+6 more)

### Community 34 - "Cluster 34"
Cohesion: 0.25
Nodes (13): Path, declared_rows(), git_sha(), main(), normalise(), p_grid(), Generate the committed QEC fixture grid (docs/QEC_V1_SIMULATION_PLAN.md).…, Every NOT_IMPLEMENTED decoder appears once, with null metrics and a reason. (+5 more)

### Community 35 - "Cluster 35"
Cohesion: 0.21
Nodes (10): DecoderStatus, physical_qubits(), §2.3 memory-patch count for ONE logical qubit. Not a full-stack resource…, not_implemented_row(), Decoder registry (QEC_METHODS.md §5, §27, §71). Phase-6 scope narrows…, A declared-but-not-run row: configuration is echoed, every metric is null (§27,…, status_of(), QEC simulation module (docs/QEC_METHODS.md, docs/QEC_V1_SIMULATION_PLAN.md).… (+2 more)

### Community 36 - "Cluster 36"
Cohesion: 0.15
Nodes (13): axes, codes, distances, noise_models, p_grids, circuit_level, code_capacity, phenomenological (+5 more)

### Community 37 - "Cluster 37"
Cohesion: 0.17
Nodes (11): field_validator, check_probability_confidence(), I-4: every probability-typed confidence is in [0, 1]., BaseModel, The model's heuristic confidence in its own estimate. Not a coverage…, StrategyConfidence, CostEstimate, BaseModel (+3 more)

### Community 38 - "Cluster 38"
Cohesion: 0.20
Nodes (10): check_field_unit_suffix(), check_field_unit_suffixes(), I-3: a `*_usd` / `*_us` / `*_seconds` field name must agree with…, I-3 applied to a `{field_name: Quantity | None}` mapping; `None` entries…, HardwareProfile, BaseModel, model_validator, QECCapability (+2 more)

### Community 39 - "Cluster 39"
Cohesion: 0.18
Nodes (11): dependencies, lucide-react, react, react-dom, react-router-dom, zod, lucide-react, react (+3 more)

### Community 40 - "Cluster 40"
Cohesion: 0.20
Nodes (6): Architect Agent, Backend / Platform Lead Agent, Michael (GOD / Chief Orchestrator), Contract Pipeline, ADR-0001 Repository Location & Name, HashRouter Routing Choice

### Community 41 - "Cluster 41"
Cohesion: 0.22
Nodes (9): Gap B — Independent Reliability Verification, Gap C — Calibration Drift Awareness, QRP Product Vision (hardware-independent reliability control plane), RECON-8 — execution_mode & Nullable Actuals, C2 — Reliability Verification, C3 — Hardware & Calibration Intelligence, Product-Level Honesty Rules, Quantum Reliability Platform (QRP) — Hardware-Independent Reliability Control Plane (+1 more)

### Community 42 - "Cluster 42"
Cohesion: 0.24
Nodes (5): DemoBackend, DemoProvider, DemoProvider — seeded, deterministic backend profiles (MISSION §13). The…, The only adapter the prototype can actually execute against., A deterministic 14-point history ending 'now'. Same input → same output (§33).

### Community 43 - "Cluster 43"
Cohesion: 0.22
Nodes (9): bytes, row_count, sha256, files, decoder_comparison, threshold_grid, bytes, row_count (+1 more)

### Community 44 - "Cluster 44"
Cohesion: 0.22
Nodes (9): physical_qubits, repetition, rotated_surface, 3, 5, 7, 3, 5 (+1 more)

### Community 45 - "Cluster 45"
Cohesion: 0.31
Nodes (6): CalibrationMetrics, CalibrationSnapshot, CalibrationValidity, BaseModel, model_validator, `CalibrationSnapshot` — the device at a moment, plus its drift verdict…

### Community 46 - "Cluster 46"
Cohesion: 0.25
Nodes (8): scripts, build, dev, e2e, preview, test, test:watch, typecheck

### Community 47 - "Cluster 47"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, extends, include, ../../tsconfig.base.json, playwright.config.ts, vite.config.ts

### Community 48 - "Cluster 48"
Cohesion: 0.25
Nodes (8): decoders, bp, bp_osd, custom, gpu_decoder, majority_vote, mwpm_pymatching, union_find

### Community 49 - "Cluster 49"
Cohesion: 0.32
Nodes (7): ADR-0002 Model Roster Resolution, ADR-0004 Fresh Roster, Not Repurposed Trading Agents, ADR-0006 Canonical Model IDs; Subscription Auth, ADR-0007 Whole Floor On Claude Subscription, ADR-0008 Revert ADR-0007; Keep Cross-Provider Plan, ADR-0009 Codex Model Slug Is gpt-5.6, ADR-0010 Codex Non-Functional; All Roles To Claude

### Community 50 - "Cluster 50"
Cohesion: 0.29
Nodes (7): data_provenance field, Decoder Comparison Slice (decoder_comparison.json), Two QEC Execution Modes (demo_replay / local_simulation), Precomputed Fixture Grid (threshold_grid.json), Fixture Manifest (manifest.json), Shot Budget (max_shots=100k, max_errors=1000), Fixture Size Budget (<=200KB)

### Community 51 - "Cluster 51"
Cohesion: 0.52
Nodes (5): borderRadius, colors, fontFamily, fontSize, spacing

### Community 52 - "Cluster 52"
Cohesion: 0.29
Nodes (7): Demo Data Policy (§33), Gap G — QEC Code + Decoder Selection, RECON-15 — Precomputed Seeded Fixture Grid, RECON-17 — Decoder Scope (MWPM only REAL), C4 — QEC Lab & Planning, Majority-Vote Decoder (repetition code only, REAL), UX Flow B — QEC Lab

### Community 53 - "Cluster 53"
Cohesion: 0.33
Nodes (6): @qrp/web package.json, name, private, type, version, qrp root package.json (workspaces)

### Community 55 - "Cluster 55"
Cohesion: 0.53
Nodes (6): decoder_comparison.json (42-row decoder comparison fixture), threshold_grid.json (216-row QEC threshold fixture), scripts/generate_qec_fixtures.py, mwpm_pymatching decoder (REAL, only implemented decoder in V1), Stim + PyMatching (MWPM decoder) simulation toolchain, QEC Lab (threshold plot feature)

### Community 56 - "Cluster 56"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 57 - "Cluster 57"
Cohesion: 0.40
Nodes (4): Compatibility, BaseModel, model_validator, Three-valued, from the machine-readable matrix owned by QEM Sci (RECON-13).

### Community 58 - "Cluster 58"
Cohesion: 0.50
Nodes (3): check_quantity(), I-1 (finite; probability range), I-2 (usd/count/ratio >= 0), by…, model_validator

### Community 60 - "Cluster 60"
Cohesion: 0.67
Nodes (3): shot_budget, max_errors, max_shots

### Community 61 - "Cluster 61"
Cohesion: 0.67
Nodes (3): Release / DevOps Engineer Agent, CI Gates (ci.yml), GitHub Pages Deploy

### Community 62 - "Cluster 62"
Cohesion: 1.00
Nodes (3): ApiReliabilityDataSource, DemoReliabilityDataSource, ReliabilityDataSource

### Community 63 - "Cluster 63"
Cohesion: 0.67
Nodes (3): DecoderConfig, Edge QEC Control Plane, Universal QEC Adapters

### Community 64 - "Cluster 64"
Cohesion: 0.67
Nodes (3): DemoProvider, Modular Monolith, Not Services, QuantumProviderAdapter

## Knowledge Gaps
- **264 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `PAGES` (+259 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `QecConfigError` connect `Cluster 22` to `Cluster 17`, `Cluster 18`, `Cluster 35`, `Cluster 30`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `estimate()` connect `QEM Bias/Variance Model` to `QEM Strategy Catalog`, `Cluster 30`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `workload_id()` connect `Cluster 14` to `Cluster 30`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `ValueError` (e.g. with `workload_id()` and `check_demo_replay_actuals_null()`) actually correct?**
  _`ValueError` has 26 INFERRED edges - model-reasoned connections that need verification._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _264 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `QEM Strategy Catalog` be split into smaller, more focused modules?**
  _Cohesion score 0.054647599591419814 - nodes in this community are weakly interconnected._
- **Should `API Contract & Agent Roles` be split into smaller, more focused modules?**
  _Cohesion score 0.06386066763425254 - nodes in this community are weakly interconnected._