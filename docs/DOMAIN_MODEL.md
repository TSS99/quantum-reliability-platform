# DOMAIN_MODEL — QRP V1

**Status:** Phase-1 authored (Architect). **Scope:** the **nine** objects on the Flow-A path and nothing
else (RECON-6, §50's "no type without a consumer"). **Authority:** the Pydantic models in
`services/api/app/schemas/` are the single source of truth; this document is their specification and the
TypeScript/Zod side is *generated* from `openapi.json` (RECON-1). If this file and the Pydantic models
disagree, that is a bug in one of them — never a licence to hand-write a second TS model.

---

## 1. Conventions

- **Wire format is `snake_case`**, identical in `demo-data/` and in API responses, so swapping
  `DemoReliabilityDataSource` → `ApiReliabilityDataSource` is byte-compatible (RECON-2, §49).
  `camelCase` never crosses the seam; the frontend may use camelCase only for view-model types it owns.
- **Timestamps** are RFC 3339 UTC strings with a `Z` suffix (`2026-08-27T07:03:26Z`).
- **Enums are closed and lowercase-snake**; unknown values are a validation error, never silently
  coerced.
- **Nullable means "not provided".** A device metric the provider does not publish is `null` and renders
  as "Not provided". Zero is a *measurement*, never a stand-in for absence (§20).
- **Field-name suffixes carry the unit** (`*_usd`, `*_us`, `*_seconds`) **and** the machine-readable unit
  travels in the `Quantity`. The shared validator asserts the two agree (§51, RECON-3).

### 1.1 `Quantity` — the typed-value envelope (RECON-3)

```python
class Quantity(BaseModel):
    value: float
    unit: Unit                # closed enum, below
    provenance: Provenance    # closed enum, below
    method_ref: str           # doc anchor, e.g. "QEM_METHODS.md#zne-gate-folding"

Unit = Literal[
    "probability",         # 0..1 inclusive. Error rates and probabilities NEVER ship as percent.
    "expectation_value",   # normalized observable <O> in [-1, 1]; absolute errors on it in [0, 2]
    "ratio",               # dimensionless multiplier, >= 0 (sampling overhead, variance inflation)
    "usd",                 # money, >= 0
    "seconds",
    "microseconds",        # T1/T2 and gate/measurement durations
    "count",               # dimensionless non-negative measured/estimated count
]

Provenance = Literal[
    "measured",            # read off real hardware or a real provider API
    "simulated",           # computed by a real simulator we actually ran (Stim, shot sampling)
    "heuristic",           # our model's opinion; not validated against hardware
    "demo_fixture",        # a seeded value from demo-data/
    "planning_estimate",   # a forward-looking projection (PEC overhead, QEC resource plans)
]
```

**Scope boundary (see `DECISIONS.md` ADR-0011).** `Quantity` wraps every **physical or estimated**
number. It does **not** wrap **exact structural integers** that are read off the input with no modelling
step — `qubit_count`, `depth`, gate counts, `distance`, `rounds`, `shots`, `seed`, list lengths. Those
are plain `int`. Wrapping them would add four fields of noise per integer and would falsely imply a
provenance decision was made. Rule of thumb: *if the number could have been different under a different
model, it is a `Quantity`.*

### 1.2 Statistical vs strategy confidence (RECON-9)

These are two different things and are **never** combined into one number, one field, or one UI element.

```python
class StatisticalConfidence(BaseModel):
    """Frequentist coverage on the sampling / shot-noise part ONLY."""
    level: float                     # e.g. 0.95
    interval: tuple[float, float]    # on <O>, in expectation_value units
    method: Literal["wilson", "normal", "bootstrap"]
    insufficient_statistics: bool    # true when shots are too few for the method to be honest

class StrategyConfidence(BaseModel):
    """The model's heuristic confidence in its own estimate. Not a coverage probability."""
    value: float                     # 0..1
    basis: str                       # deterministic template string, e.g.
                                     # "compatibility=compatible; calibration_age=4h; regime=in-range"
```

`ReliabilityGoal.confidence_target` refers to **`StatisticalConfidence.level`** only.

### 1.3 `target_error` semantics (RECON-10)

`target_error` is the **maximum acceptable absolute error on a normalized observable** ⟨O⟩ ∈ [-1, 1]:

```
target_error >= | <O>_reported − <O>_true |
```

Unit `expectation_value`; valid range `(0, 2]`; practical range `1e-3 … 1e-1`. Every example workload
therefore ships with its observable (RECON-14) — without one, "error" has no referent. A goal of `1e-5`
is accepted by the schema but preflight returns `TARGET_ERROR_UNLIKELY` for QEM strategies on NISQ
(RECON-11).

## 2. Determinism and identifiers (RECON-7, §31, §33)

All ids are derived, never random, never time-seeded. Same seed + same input ⇒ same id, across processes
and reloads.

**Canonical hashing.** `sha(x) = sha256(canonical_json(x).encode("utf-8")).hexdigest()`, where
`canonical_json` sorts object keys, emits no whitespace, and formats floats as `repr(round(v, 12))`.
Ids take the first 16 hex characters and a type prefix.

| Id | Derivation | Prefix |
|---|---|---|
| `circuit_fingerprint` | `sha(normalized_circuit_characteristics)` | `cf_` |
| `calibration_snapshot_id` | `sha(backend_id \| captured_at \| seed)` | `cal_` |
| `plan_id` | `sha(circuit_fingerprint \| backend_id \| strategy_id \| sha(goal) \| seed)` | `plan_` |
| `run_id` | `sha(plan_id \| shots \| seed)` | `run_` |
| `receipt_id` | shares the `run_id` suffix (receipt ↔ run is 1:1) | `rcpt_` |
| `workload_id` | example slug, or `wl_` + `sha(source_text \| seed)` for pasted/uploaded | `wl_` |

**Normalized circuit characteristics** (the fingerprint input, §31): `qubit_count`, `depth`,
`gate_histogram` (sorted `{gate_name: count}`), `two_qubit_ratio` (rounded to 6 dp),
`measurement_pattern`, `observable_profile`, `connectivity_class`, `parameter_count`. Names, comments,
whitespace and register names are excluded.

*Known limitation, stated rather than hidden:* V1 normalizes literally. Two circuits that are equivalent
only under qubit relabeling or gate commutation get different fingerprints. Graph-isomorphism
canonicalization is out of scope (§31 — no vector/ML retrieval in V1).

## 3. The nine objects

### 3.1 `QuantumWorkload` — what the user wants to run

```python
class QuantumWorkload(BaseModel):
    workload_id: str
    name: str
    source: Literal["example", "pasted_qasm", "uploaded_qasm"]
    qasm: str                       # OpenQASM 3 text; validated per RECON-31 before parse
    observable: Observable          # REQUIRED — RECON-14
    description: str | None = None
    tags: list[str] = []

class Observable(BaseModel):
    """A normalized observable whose expectation lies in [-1, 1]."""
    name: str                       # "ZZ", "Z0", "H_vqe"
    pauli_terms: list[PauliTerm]    # sum of weighted Pauli strings
    normalized: bool = True         # invariant: sum(|coefficient|) == 1 when true

class PauliTerm(BaseModel):
    pauli: str                      # e.g. "ZZII", length == qubit_count
    coefficient: float
```

**Input safety (RECON-31):** treated as text (content-sniffed, never trusted by extension), ≤256 KB, with
caps on qubits/gates/depth, parsed under a timeout, rejected with a structured §43 error. No `eval`, no
`exec`, no `pickle`, no dynamic import.

### 3.2 `CircuitProfile` — what the circuit *is* (output of step `analyze`)

```python
class CircuitProfile(BaseModel):
    circuit_fingerprint: str
    workload_id: str
    qubit_count: int
    depth: int
    gate_count: int
    two_qubit_gate_count: int
    measurement_count: int
    gate_histogram: dict[str, int]
    two_qubit_ratio: float                    # 0..1
    parameter_count: int
    connectivity_class: Literal["linear", "star", "grid", "all_to_all", "irregular"]
    idle_exposure: Quantity                   # unit "microseconds"; gates DD could act on
    has_dynamic_circuits: bool                # mid-circuit measurement / feed-forward
    has_mid_circuit_measurement: bool
    observable_count: int
    analysis_provenance: Provenance           # "measured" == really parsed
```

`idle_exposure` is the gate that decides whether dynamical decoupling is even offered: DD requires
`idle_exposure > 0` **and** backend delay/scheduling support, otherwise it is a no-op and is excluded
rather than offered at zero benefit (RECON-13).

### 3.3 `HardwareProfile` — a backend, honestly described

```python
class HardwareProfile(BaseModel):
    backend_id: str
    provider_id: str
    display_name: str
    technology: Literal["superconducting", "trapped_ion", "neutral_atom", "photonic", "simulator"]
    adapter_status: Literal["implemented", "planned"]   # §13 — never claim unimplemented support
    qubit_count: int
    coupling_map: list[tuple[int, int]]
    connectivity_class: Literal["linear", "heavy_hex", "grid", "all_to_all", "irregular"]
    basis_gates: list[str]
    supports_dynamic_circuits: bool | None
    supports_mid_circuit_measurement: bool | None
    supports_delay_scheduling: bool | None              # DD prerequisite
    supports_reset: bool | None
    latest_calibration_snapshot_id: str | None
    qec_capability: QECCapability
    pricing_ref: str                                   # key into the §52 cost config

class QECCapability(BaseModel):
    """§20 future-QEC fields. Every one is nullable: null renders 'Not provided', never 0."""
    measurement_latency_us: Quantity | None
    reset_latency_us: Quantity | None
    feed_forward_latency_us: Quantity | None
    leakage_rate: Quantity | None                      # unit "probability"
    decoder_latency_budget_us: Quantity | None
    syndrome_cycle_estimate_us: Quantity | None
    classical_bandwidth_ref: str | None
```

### 3.4 `CalibrationSnapshot` — the device at a moment, plus its drift verdict

```python
class CalibrationSnapshot(BaseModel):
    calibration_snapshot_id: str
    backend_id: str
    captured_at: datetime
    age_seconds: float                       # computed against request time
    metrics: CalibrationMetrics
    validity: CalibrationValidity
    seed: int                                # demo history is seeded (§33)

class CalibrationMetrics(BaseModel):
    t1_us: Quantity | None
    t2_us: Quantity | None
    single_qubit_error_rate: Quantity | None        # unit "probability"
    two_qubit_error_rate: Quantity | None
    readout_error_rate: Quantity | None
    measurement_time_us: Quantity | None
    per_qubit: dict[str, CalibrationMetrics] | None = None   # optional per-qubit detail

class CalibrationValidity(BaseModel):
    state: Literal["stable", "watch", "stale", "significant_drift"]
    thresholds_ref: str                      # config key; thresholds are DISPLAYED, not hidden (§21)
    explanation: str                         # deterministic template, never free prose
    drift_findings: list[Finding]            # may include CALIBRATION_STALE
```

`state` is computed from *configured, documented* thresholds — relative metric change since the reference
snapshot, and absolute age. They are tuning parameters of this product, not universal physical constants
(§21).

### 3.5 `ReliabilityGoal` — the SLO (Gap D)

```python
class ReliabilityGoal(BaseModel):
    target_error: Quantity                   # unit "expectation_value"; see §1.3
    confidence_target: float                 # 0..1; refers to StatisticalConfidence.level
    max_cost_usd: Quantity                   # unit "usd", >= 0
    max_runtime_seconds: Quantity            # unit "seconds", >= 0
    priority: Literal["minimize_cost", "balanced", "maximize_accuracy", "custom"]
    weights: ScoreWeights | None = None      # required iff priority == "custom"

class ScoreWeights(BaseModel):
    """§29. Presets map to fixed, documented weight vectors; they are not free-floating."""
    w_error: float
    w_cost: float
    w_time: float
    w_qubit_overhead: float                  # QEC only; 0 for QEM-only plans
    w_decoder_latency: float                 # QEC only; 0 for QEM-only plans
```

Constraints override weights: a plan over `max_cost_usd` is infeasible regardless of how attractive its
score is (§29, RECON-19).

### 3.6 `MitigationStrategy` — a candidate technique, with its compatibility verdict

```python
class MitigationStrategy(BaseModel):
    strategy_id: str                         # stable slug: "raw", "readout_m3", "dd_readout",
                                             # "zne_folding", "dd_zne", "pec_planning"
    display_name: str
    family: Literal["none", "readout", "dynamical_decoupling", "zne", "pec"]
    maturity: Literal["implemented", "experimental", "planned"]
    executable: bool                         # PEC is False in V1 — calculator only (RECON-13)
    twirling_enabled: bool = False           # a MODIFIER, never a standalone strategy (RECON-13)
    parameters: dict[str, float | int | str | bool]   # family-specific; see QEM_METHODS.md
    compatibility: Compatibility
    method_ref: str

class Compatibility(BaseModel):
    """Three-valued, from the machine-readable matrix owned by QEM Sci (RECON-13)."""
    verdict: Literal["compatible", "conditional", "incompatible"]
    conditions: list[str] = []               # populated iff verdict == "conditional"
    reason_codes: list[ReasonCode] = []      # populated iff verdict == "incompatible"
```

The compatibility matrix is **data, not code** — one file consumed by the backend generator, the §22
Strategy Explorer, and the tests. A strategy whose `verdict == "incompatible"` is never turned into an
`ExecutionPlan`.

### 3.7 `ExecutionPlan` — a scored, feasibility-checked candidate

```python
class ExecutionPlan(BaseModel):
    plan_id: str
    circuit_fingerprint: str
    backend_id: str
    calibration_snapshot_id: str
    strategy: MitigationStrategy
    shots: int
    cost_estimate: CostEstimate
    reliability_estimate: ReliabilityEstimate
    feasibility: Literal["feasible", "infeasible"]
    findings: list[Finding]                  # Stage-A violations; non-empty when infeasible
    score: ScoreBreakdown | None             # null when infeasible — infeasible plans are NOT scored
    is_recommended: bool                     # at most one true per optimize response
    seed: int

class CostEstimate(BaseModel):
    estimated_cost_usd: Quantity             # >= 0, provenance "heuristic" or "demo_fixture"
    estimated_qpu_seconds: Quantity
    estimated_queue_seconds: Quantity | None
    minimum_charge_usd: Quantity | None
    pricing_model_ref: str                   # §52 config key; no live pricing in V1

class ReliabilityEstimate(BaseModel):
    """RECON-12. A scalar 'expected error' is FORBIDDEN: ZNE/PEC trade bias for variance."""
    bias_estimate: Quantity                  # heuristic, unit "expectation_value"
    stat_std: Quantity                       # computable, unit "expectation_value"
    rmse: Quantity                           # sqrt(bias^2 + std^2); what the optimizer consumes
    statistical_confidence: StatisticalConfidence
    strategy_confidence: StrategyConfidence
    sampling_overhead: Quantity              # unit "ratio", >= 1
    variance_inflation: Quantity             # unit "ratio", >= 1 (readout mitigation is never < 1)
    method_ref: str

class ScoreBreakdown(BaseModel):
    """RECON-20: interpretable, with fixed documented normalization ranges — NOT per-batch min-max."""
    total: float
    terms: list[ScoreTerm]
    weights: ScoreWeights
    normalization_ref: str                   # doc anchor for the fixed ranges
    tie_break_applied: bool                  # deterministic epsilon tie-break: lower cost wins

class ScoreTerm(BaseModel):
    key: Literal["error", "cost", "time", "qubit_overhead", "decoder_latency"]
    raw_value: float
    normalized_value: float                  # 0..1
    weight: float
    contribution: float                      # normalized_value * weight
```

### 3.8 `ExperimentRun` — what actually happened

```python
class ExperimentRun(BaseModel):
    run_id: str
    plan_id: str
    execution_mode: ExecutionMode            # RECON-8, mandatory
    started_at: datetime
    completed_at: datetime | None
    status: Literal["completed", "failed"]
    shots: int
    seed: int
    raw_estimate: Quantity                   # unmitigated <O>
    processed_estimate: Quantity             # after the strategy
    statistical_confidence: StatisticalConfidence
    actual_runtime_seconds: Quantity | None  # null iff execution_mode == "demo_replay"
    actual_cost_usd: Quantity | None         # null iff execution_mode == "demo_replay"
    lineage: Lineage
    warnings: list[Finding] = []

ExecutionMode = Literal["demo_replay", "local_simulation", "hardware"]

class Lineage(BaseModel):
    """§32 — reproducibility, not decoration."""
    qrp_version: str
    schema_version: str
    seed: int
    circuit_fingerprint: str
    calibration_snapshot_id: str
    library_versions: dict[str, str]         # e.g. stim, pymatching, sinter, qiskit, numpy
    generated_at: datetime
```

### 3.9 `ReliabilityReceipt` — the Gap-B evidence artifact

```python
class ReliabilityReceipt(BaseModel):
    receipt_id: str
    schema_version: str                      # RECON-8 — of THIS receipt schema
    qrp_version: str                         # RECON-8 — of the software that produced it
    execution_mode: ExecutionMode            # RECON-8 — mandatory, no default
    run_id: str
    generated_at: datetime

    # what was run
    circuit_fingerprint: str
    workload_name: str
    observable: Observable
    backend_id: str
    calibration_snapshot_id: str
    strategy: MitigationStrategy
    shots: int

    # what came out
    raw_estimate: Quantity
    processed_estimate: Quantity
    statistical_confidence: StatisticalConfidence
    strategy_confidence: StrategyConfidence
    improvement: Quantity | None             # |raw - processed| on <O>; null if not computable

    # what it cost
    estimated_runtime_seconds: Quantity
    estimated_cost_usd: Quantity
    actual_runtime_seconds: Quantity | None  # null iff execution_mode == "demo_replay"
    actual_cost_usd: Quantity | None         # null iff execution_mode == "demo_replay"

    # whether it met the promise
    goal: ReliabilityGoal
    goal_result: Literal["met", "not_met", "indeterminate"]
    warnings: list[Finding]
    lineage: Lineage
```

`goal_result` is `indeterminate` — not `met` — whenever `statistical_confidence.insufficient_statistics`
is true. A receipt never claims success it cannot support.

## 4. Invariants — ONE shared validator (RECON-3, §46)

Implemented once in `services/api/app/domain/invariants.py`, mirrored by the generated Zod schemas, and
exercised as property tests. Not re-implemented per feature.

| # | Invariant |
|---|---|
| I-1 | `Quantity.value` is finite; unit `probability` ⇒ `0 ≤ value ≤ 1`; `expectation_value` ⇒ `-1 ≤ value ≤ 1` for estimates, `0 ≤ value ≤ 2` for errors |
| I-2 | `usd` and `count` quantities are `≥ 0`; `ratio` quantities are `≥ 0`, and overhead/inflation ratios are `≥ 1` |
| I-3 | Field-name unit suffix matches `Quantity.unit` (`*_usd` ⇒ `usd`, `*_us` ⇒ `microseconds`, `*_seconds` ⇒ `seconds`) |
| I-4 | Every probability-typed confidence is in `[0, 1]` |
| I-5 | `rmse == sqrt(bias_estimate² + stat_std²)` within 1e-12 |
| I-6 | `feasibility == "infeasible"` ⇒ `score is None` **and** `is_recommended is False` (an infeasible plan can never be the recommendation, §46) |
| I-7 | `execution_mode == "demo_replay"` ⇒ `actual_runtime_seconds is None` **and** `actual_cost_usd is None` (RECON-8) |
| I-8 | Ids match `^(cf\|cal\|plan\|run\|rcpt\|wl)_[0-9a-f]{16}$` and re-derive exactly from their inputs |
| I-9 | `Observable.normalized` ⇒ `sum(abs(coefficient)) == 1` within 1e-9 |
| I-10 | Any `Quantity` whose `provenance == "planning_estimate"` must be labeled as such wherever it renders (asserted in the UI snapshot tests) |
| I-11 | `strategy.executable is False` ⇒ no `ExperimentRun` may reference a plan using it (PEC, RECON-13) |
| I-12 | Same `(seed, workload, goal, backend set)` ⇒ byte-identical optimize response (RECON-7) |

## 5. Deliberately deferred (RECON-6)

`NoiseProfile`, `ErrorDetectionStrategy`, `QECStrategy`, `QECCode`, `DecoderConfig`, `MitigationResult`,
`QECResult`, `ProviderBackend`, `DriftEvent` from §12 are **not** defined here. They land with their
consumers: QEC types in Phase 6, `DriftEvent` in Phase 8. Defining them now would produce nine types with
no caller and guarantee a rewrite when the caller finally arrives.

`Finding` and `ReasonCode`, referenced throughout, are specified in `API_CONTRACT.md` §3 — they are one
shared module co-owned with the Optimizer (RECON-21).
