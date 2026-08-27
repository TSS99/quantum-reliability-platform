# QEM Methods — scientific model for V1

Owner: QEM Scientist. Governs MISSION §22 (Strategy Explorer), §18 step 5 (strategy generation),
§29 (optimizer inputs) and §53 (documented QEM model). Frozen decisions from
`docs/PHASE1_RECONCILE.md` (cited as `RECON-N`) win wherever they differ from `docs/MISSION.md`.

**This document explains. It does not define.** The compatibility rules are data, in
`docs/data/qem_compatibility.json` — the single source consumed by the Phase-5 strategy generator,
the §22 Explorer UI, and the §46 invariant tests. If a rule appears in prose here and in that file,
the file is authoritative and this document is a bug.

Everything modelled here is **heuristic** unless stated otherwise. Every number this model emits
crosses the API as `{ value, unit, provenance, method_ref }` (RECON-3) with
`provenance = "heuristic"`, `"planning_estimate"`, or `"demo_fixture"` — never `"measured"`.

---

## 1. What "error" means (RECON-10)

`target_error`, `bias_estimate`, `stat_std` and `rmse` are all **absolute error on a normalized
observable** ⟨O⟩ ∈ [-1, 1], in the same units as ⟨O⟩ itself (dimensionless).

- The workload declares an observable O with eigenvalues in [-1, +1] (a Pauli string, or a
  normalized weighted sum of Pauli strings). **A workload without an observable has no defined
  error** (RECON-14) — see §7.
- `target_error = 0.01` therefore means "I need ⟨O⟩ to within ±0.01 absolute", not 1 % relative.
- For `task_type = sampling_distribution` there is no scalar ⟨O⟩. V1 reports total variation
  distance for those workloads and **does not** apply the ZNE/PEC branch of this model at all
  (see the matrix rules `ZNE_REQUIRES_EXPECTATION_VALUE`, `PEC_REQUIRES_EXPECTATION_VALUE`).

### 1.1 The 1e-5 honesty rule (RECON-11)

`target_error = 1e-5` is **not reachable by any QEM technique on NISQ hardware**. QEM removes bias
by paying variance; reaching 1e-5 statistically alone needs ≳1e10 shots before any mitigation
overhead, and no bias model is accurate to 1e-5 in the first place.

- MISSION §3's API sketch keeps `1e-5` as written. Doc and demo examples use **1e-2 … 1e-3**.
- Any surfaced `1e-5` must be labelled a **QEC planning estimate**
  (`provenance = "planning_estimate"`), never a QEM result.
- Preflight returns `TARGET_ERROR_UNLIKELY` whenever `target_error < 1e-3` on a QEM-only path.
  This is a `RUN_WITH_WARNING`, not a hard block — the user may still want the run.
- **Forbidden:** a UI that shows a QEM strategy "meeting" a 1e-5 goal.

---

## 2. The estimate model: bias + variance, never one scalar (RECON-12)

A single "expected error" number is **forbidden**. ZNE and PEC trade bias for variance; a scalar
hides exactly the trade the product exists to expose.

Every `ReliabilityEstimate` carries three numbers:

| field | meaning | provenance | computable? |
|---|---|---|---|
| `bias_estimate` | modelled systematic offset of the processed estimator from the ideal ⟨O⟩ | `heuristic` | no — model output |
| `stat_std` | 1σ shot-noise standard error of the processed estimator | `heuristic` (formula is exact; the inputs are modelled) | yes — closed form |
| `rmse` | `sqrt(bias_estimate² + stat_std²)` | `heuristic` | derived |

The optimizer (§29) consumes `rmse` as its `E` term. The UI shows **both components** — a strategy
that halves bias while tripling σ must look like what it is.

Confidence is two separate fields (RECON-9) and they are never merged:
- `statistical_confidence` — frequentist coverage of the shot-noise part only (e.g. 0.95 for ±1.96·`stat_std`).
- `strategy_confidence` — the model's heuristic confidence in its own `bias_estimate`. Always < 1.

### 2.1 Variance

For a normalized observable measured over `N` shots, the unmitigated single-shot variance is
`1 - ⟨O⟩²  ≤ 1`. V1 uses the conservative bound ⟨O⟩ = 0:

```
stat_std = sqrt(V_amp) * sqrt( (1 - O_est²) / N_shots )        default O_est = 0
```

`V_amp ≥ 1` is the **variance amplification factor** of the strategy — the per-technique values are
in §5, and they multiply across a combined strategy. `V_amp` is also the strategy's
**shot multiplier**: the factor by which `N_shots` must grow to hold `stat_std` at the raw level.

### 2.2 Bias

V1 uses the **global depolarizing approximation**: to first order the noisy expectation value of a
deep circuit is the ideal one attenuated by an effective fidelity,

```
<O>_noisy ≈ F * <O>_ideal ,      F = exp( - E_total ) ,      E_total = E_1q + E_2q + E_idle + E_ro
```

with the error budget accumulated from the calibration snapshot:

| term | formula | source |
|---|---|---|
| `E_1q` | Σ over 1-qubit gates of ε_1q | CalibrationSnapshot |
| `E_2q` | Σ over 2-qubit gates of ε_2q | CalibrationSnapshot (dominant term in practice) |
| `E_idle` | Σ over qubits of t_idle,q / T2,q | CircuitProfile schedule × CalibrationSnapshot |
| `E_ro` | Σ over measured qubits of ε_readout | CalibrationSnapshot |

Because ⟨O⟩_ideal is unknown, V1 reports the conservative bound |⟨O⟩_ideal| = 1:

```
bias_raw = 1 - F
bias_strategy = 1 - exp( - ( r_1q·E_1q + r_2q·E_2q + r_idle·E_idle + r_ro·E_ro ) )
```

where `r_channel ∈ (0, 1]` is the **residual factor** the strategy leaves in that channel. `r = 1`
means "this strategy does nothing to this error channel". Defaults in §5.7.

**Assumptions this model makes, stated so they can be attacked:**
1. Noise is (or has been twirled into being) stochastic and approximately depolarizing. Coherent
   error violates this; that is what the twirling modifier is for (§5.3).
2. Error channels are independent and their rates add. Crosstalk and context-dependent gate error
   are not modelled.
3. |⟨O⟩_ideal| = 1. For observables with small ideal magnitude this over-states bias — a
   conservative direction, but it is an over-statement, not a measurement.
4. Residual factors `r` are fitted constants, not derived from the hardware. They are
   `provenance: heuristic`, configurable, and documented — never universal constants (§21).

**What this model may never be used for:** claiming a measured improvement. `improvement` on a
Reliability Receipt is only real when `execution_mode != demo_replay` (RECON-8); in demo replay it
is a modelled delta and is labelled as one (§34, RECON-28).

---

## 3. Sampling overhead is a multiplier, not an addend

MISSION §46's invariant "mitigation overhead ≥ 0" is ambiguous. The frozen reading for V1:

```
shot_multiplier  >= 1.0      (a strategy can never need fewer shots than raw)
extra_shots      = (shot_multiplier - 1) * N_raw  >= 0
```

The invariant test asserts `shot_multiplier >= 1.0`. Asserting `>= 0` would pass for a strategy
claiming to need *half* the shots of raw, which is not physical.

Runtime overhead is separate from shot overhead: ZNE folding multiplies shots **and** per-shot
circuit duration; twirling multiplies job count but neither shots nor duration.

---

## 4. Maturity labels (§22)

| label | meaning | may be executed? | may be recommended? |
|---|---|---|---|
| `implemented` | runs end-to-end in the V1 engine | yes | yes |
| `experimental` | runs, but the model is weakly validated | yes, behind a label | no |
| `planned` | declared and possibly modelled; **no executable path** | no | no |

V1 ships **no** `experimental` techniques. Shipping a `planned` technique as if it ran is a §71
forbidden shortcut.

---

## 5. Per-technique reference (§53 fields)

Each subsection carries the §53 set: requirements, implementation, parameters, expected overhead,
limitations, supported circuit types, citation notes. The machine-readable compatibility rules for
each live under the matching `techniques[].id` in `docs/data/qem_compatibility.json`.

### 5.1 Readout (assignment) error mitigation — `readout_mitigation` · implemented

- **Category:** post-processing. **Role:** strategy.
- **Requirements:** ≥1 measured qubit; assignment-error data in the calibration snapshot
  (`backend.provides_readout_calibration`). Calibration older than 24 h → `CALIBRATION_STALE`
  conditional: a stale assignment matrix can *increase* bias.
- **Implementation:** `method ∈ {tensored, m3}`. **Dense 2^n confusion-matrix inversion is not
  offered at any size** (RECON-13) — it is unusable past ~10 qubits and offering it at 8 qubits
  teaches the wrong thing. `tensored` assumes independent per-qubit assignment error; `m3` handles
  the measured subspace only and scales to large registers.
- **Parameters:** `method` (default `tensored`).
- **Expected overhead:** `shot_multiplier = 1.0` for the experiment itself, plus `2n` short
  calibration circuits (amortised across every run against the same snapshot). The real cost is
  variance: for uncorrelated symmetric assignment error ε̄ over `n` measured qubits, unbiased
  inversion inflates variance by roughly

  ```
  V_amp ≈ (1 - 2·ε̄) ^ (-2n)
  ```

  → n=10, ε̄=0.02: `V_amp ≈ 2.3` (σ ×1.5). n=50, ε̄=0.02: `V_amp ≈ 59` (σ ×7.7). This is why
  readout mitigation is *not* free, contrary to how it is usually presented.
- **Limitations:** removes assignment error only — nothing upstream of the measurement. `tensored`
  is blind to correlated readout error. For `sampling_distribution` the inverted vector can contain
  negative quasi-probabilities and needs a non-negativity projection (`QUASIPROB_NEGATIVE_COUNTS`).
- **Supported circuit types:** all, expectation-value and sampling alike.
- **Citations:** Bravyi et al., *Mitigating measurement errors in multi-qubit experiments*,
  PRA 103, 042605 (2021); Nation et al., *Scalable mitigation of measurement errors* (M3),
  PRX Quantum 2, 040326 (2021).

### 5.2 Dynamical decoupling — `dynamical_decoupling` · implemented

- **Category:** circuit-level. **Role:** strategy.
- **Requirements:** `circuit.idle_exposure > 0` **AND** `backend.supports_delay_instruction` **AND**
  `backend.supports_scheduled_circuits` (RECON-13). If any fails, DD is a no-op and is **excluded
  from the candidate set** rather than offered at zero benefit.
- **Implementation:** schedule the circuit, then insert an `XY4` (or `XX`) pulse sequence into each
  idle window long enough to hold it.
- **Parameters:** `sequence` (default `XY4`).
- **Expected overhead:** `shot_multiplier = 1.0`, `V_amp = 1.0`. Cost is added 1-qubit gates
  (cheap, but not free — their own error is charged to `E_1q`) and, on some backends, a slightly
  longer schedule.
- **Limitations:** protects against low-frequency dephasing during idling only. Does nothing for
  2-qubit gate error, which dominates most useful circuits. Below ~5 % idle exposure the modelled
  benefit is smaller than the model's own uncertainty (`LOW_IDLE_EXPOSURE` — offer with a
  low-benefit label). A sequence spanning a mid-circuit measurement is not a decoupling sequence
  (`DD_ACROSS_MEASUREMENT`).
- **Supported circuit types:** all, provided the backend can express the schedule.
- **Citations:** Viola, Knill & Lloyd, PRL 82, 2417 (1999); Ezzell et al., *Dynamical decoupling for
  superconducting qubits: a performance survey*, Phys. Rev. Applied 20, 064027 (2023).

### 5.3 Pauli twirling / randomized compiling — `pauli_twirling` · implemented · **MODIFIER**

- **Category:** noise tailoring. **Role:** `modifier`, not a strategy (RECON-13).
- **Why it is not a strategy:** twirling converts coherent error into stochastic Pauli error. It
  changes the *character* of the noise, not its average magnitude — the expected bias of a twirled
  expectation value is, to first order, **the same** as the untwirled one. A "Twirling" candidate on
  a Pareto plot would therefore be a point that costs compilation and shows no benefit.
  Consequently **MISSION §18's `Twirling+Readout` candidate is not generated in V1** (recorded in
  `strategies.not_offered`).
- **What it is for:** ZNE and PEC both assume the noise is stochastic and scales predictably.
  Twirling is what makes that assumption approximately true. In this model it does not reduce
  `bias_estimate`; it raises `strategy_confidence` in the ZNE/PEC bias estimate (§5.7).
- **Requirements:** expectation-value tasks; static blocks between any feed-forward boundaries.
- **Parameters:** `num_instances` (default 16). Total shots are **split** across instances.
- **Expected overhead:** `shot_multiplier = 1.0`, `V_amp = 1.0`. Cost is job/compilation count; if
  `num_instances > backend.max_circuits_per_job` the instances split across jobs
  (`JOB_BATCH_LIMIT`) — a queueing cost, not a shot cost.
- **Limitations:** does not reduce average bias on its own. Cannot propagate a twirl frame through a
  classically conditioned branch in V1 (`TWIRL_ACROSS_FEEDFORWARD`).
- **Citations:** Wallman & Emerson, *Noise tailoring for scalable quantum computation via randomized
  compiling*, PRA 94, 052325 (2016).

### 5.4 Zero-noise extrapolation — `zne` · implemented

- **Category:** extrapolation. **Role:** strategy. **Recommended modifier:** `pauli_twirling`.
- **Requirements:** `task_type = expectation_value` **only**. **Invalid** for
  mid-circuit measurement, reset, or dynamic/feed-forward circuits — folding relies on
  `U → U (U† U)^k` being an identity insertion, and a measurement, reset or classical branch is not
  unitary, so the folded circuit is not the same computation evaluated at a higher noise level.
- **Implementation:** **digital gate folding only** in V1 (RECON-13); analog / pulse-stretch noise
  scaling is out of scope. Global folding gives odd integer scale factors λ = 2k+1.
- **Parameters:** `scale_factors` (default `[1,3,5]`, alternative `[1,3]`),
  `extrapolator ∈ {richardson, linear}`.
- **Expected overhead** — this is the number people get wrong. Richardson extrapolation to λ=0
  through points λ_i has Lagrange coefficients `c_i = Π_{j≠i} (0-λ_j)/(λ_i-λ_j)` with `Σ c_i = 1`,
  and the extrapolated variance is `Σ c_i² Var_i`:

  | scale factors | coefficients | Σc² | shots split | `V_amp` | σ inflation | gate-time ×/shot-budget |
  |---|---|---|---|---|---|---|
  | `[1,3]` linear | 3/2, −1/2 | 2.50 | N/2 each | **5.0** | ×2.24 | 2.0 |
  | `[1,3,5]` Richardson | 15/8, −5/4, 3/8 | 5.219 | N/3 each | **15.7** | ×3.96 | 3.0 |

  So the default 3-point ZNE needs **~16× the shots** to hold statistical error at the raw level,
  and each of those shots runs a circuit ~3× longer on average — roughly a **47× QPU-time
  multiplier** at equal statistical precision. Any UI that shows ZNE as a small step up in cost is
  lying.
- **Limitations:** ZNE can make the estimate **worse than raw**. Two guarded cases:
  `SCALED_DEPTH_EXCEEDS_BACKEND` (the λ_max circuit does not fit the depth limit) and
  `SCALED_DURATION_EXCEEDS_T2` (past median T2 the folded point has decohered toward zero, the
  extrapolation is anchored on a dead point, and the intercept is garbage). Richardson is
  unregularised and amplifies any non-polynomial structure in the λ-dependence. Untwirled coherent
  error breaks the smooth-scaling assumption entirely.
- **Supported circuit types:** static unitary circuits with a terminal measurement of a declared
  observable.
- **Citations:** Temme, Bravyi & Gambetta, PRL 119, 180509 (2017); Li & Benjamin, PRX 7, 021050
  (2017); Giurgica-Tiron et al., *Digital zero noise extrapolation for quantum error mitigation*,
  IEEE QCE (2020); Kandala et al., Nature 567, 491 (2019).

### 5.5 Probabilistic error cancellation — `pec` · planned · **CALCULATOR ONLY**

RECON-13 resolves the §60-Phase-5 ↔ §18-step-5 conflict: **PEC does not execute in V1.** It ships
as an overhead / feasibility calculator whose outputs are `provenance: "planning_estimate"`. It is
never a candidate on the Pareto plot, and it can never be the recommendation.

- **Requirements (of the calculator):** `backend.provides_gate_error_model`. Without per-gate rates
  the one-norm cannot be estimated and the UI shows "Not provided", never `0` (§20).
- **Implementation:** the calculator only. Real PEC needs a learned noise model per layer, a
  quasi-probability decomposition of each inverse channel, and Monte-Carlo sampling over signed
  circuit instances — none of which exists in V1.
- **What the calculator computes:** the sampling overhead `γ²`, where γ is the one-norm of the
  quasi-probability decomposition. For a depolarizing model with per-gate error ε_g the V1
  approximation is

  ```
  γ = Π_g (1 + ε_g) / (1 - ε_g)  ≈ exp( 2 · Σ_g ε_g )
  shot_multiplier = γ²           ≈ exp( 4 · Σ_g ε_g )
  ```

  The constant in the exponent is a **modelling choice tied to the depolarizing assumption**
  (`provenance: heuristic`) — a different noise model gives a different constant, and the UI must
  say so. Worked examples at ε = 1e-2 per 2-qubit gate:

  | 2-qubit gates | γ | γ² (shot multiplier) | verdict |
  |---|---|---|---|
  | 100 | 7.4 | ≈ 55 | expensive but finite |
  | 250 | 148 | ≈ 2.2e4 | above the 1e4 ceiling → `PEC_OVERHEAD_INFEASIBLE` |
  | 1000 | 4.9e8 | ≈ 2.4e17 | absurd; report the number, offer nothing |

  This exponential wall is the honest point of shipping the calculator at all.
- **Limitations:** everything. It does not run. The γ model ignores the noise-learning error that
  dominates real PEC, and real γ is typically *worse* than this estimate.
- **Citations:** Temme, Bravyi & Gambetta, PRL 119, 180509 (2017); Endo, Benjamin & Li, PRX 8,
  031027 (2018); van den Berg et al., *Probabilistic error cancellation with sparse Pauli–Lindblad
  models*, Nature Physics 19, 1116 (2023).

### 5.6 Declared but not implemented (§22 completeness)

These appear in the Strategy Explorer as reference entries with `maturity: planned` and
`offered: false`. They are **declared, never faked** — no fabricated overhead numbers, no Pareto
points, no recommendation path.

| technique | why not in V1 | citation note |
|---|---|---|
| `cdr` — Clifford data regression | needs near-Clifford training circuits + a classical stabilizer reference pipeline | Czarnik et al., Quantum 5, 592 (2021) |
| `pea` — probabilistic error amplification | needs a learned sparse Pauli–Lindblad model per layer | van den Berg et al., Nature Physics 19, 1116 (2023) |
| `symmetry_verification` | needs a declared workload symmetry (e.g. particle number) the V1 workload model does not carry | Bonet-Monroig et al., PRA 98, 062339 (2018) |
| `post_selection` | needs check ancillas in the workload + mid-circuit measurement on the backend | McArdle et al., PRL 122, 180501 (2019) |

General review for all of the above: Cai et al., *Quantum error mitigation*, Rev. Mod. Phys. 95,
045005 (2023).

### 5.7 V1 default model constants

All `heuristic`, all configurable, none universal. `r_*` are residual factors for §2.2; `V_amp` for
§2.1.

| technique | r_1q | r_2q | r_idle | r_ro | V_amp |
|---|---|---|---|---|---|
| `raw` | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| `readout_mitigation` | 1.0 | 1.0 | 1.0 | 0.10 | `(1-2ε̄)^(-2n)` |
| `dynamical_decoupling` | 1.0 | 1.0 | 0.40 | 1.0 | 1.0 |
| `pauli_twirling` | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| `zne` | `ρ` | `ρ` | `ρ` | 1.0 | 5.0 (`[1,3]`) / 15.7 (`[1,3,5]`) |
| `pec` | — | — | — | — | `γ²` (calculator only) |

`ρ = min(1, (λ_max · (E_1q + E_2q + E_idle))^(m-1))` with `m = len(scale_factors)`: Richardson
through `m` points cancels the first `m-1` orders of the noise expansion and leaves `O(ε^m)`. The
`min(1, …)` cap is deliberate — in the high-noise regime the model reports **no ZNE benefit** rather
than an invented one, which is the correct behaviour.

`r_ro = 1.0` for ZNE: readout error is a fixed end-of-circuit channel that does **not** scale with
folding, so extrapolation cannot remove it. This is exactly why the ZNE + readout-mitigation
ordering in §6 matters.

Twirling contributes no `r`. Instead: `strategy_confidence` for a ZNE candidate is multiplied by
**0.7 when the twirling modifier is off**, expressing "we are less sure of this bias estimate
because the smooth-scaling assumption is unguarded". Combining strategies multiplies `V_amp` and
composes `r` per channel (take the product; a channel touched by two techniques is not corrected
twice as well, so V1 uses `r_combined = max(r_a, r_b)` — the conservative choice — for the same
channel, and the product across different channels).

---

## 6. Combination ordering constraints

Ordering is not cosmetic; two of these are correctness bugs waiting to happen. Machine-readable form
in `combinations[]`.

| combination | ordering | why |
|---|---|---|
| DD + readout | schedule → insert DD → execute → correct counts | independent stages, no interaction |
| **ZNE + readout** | fold → execute → **readout-correct per scale factor** → extrapolate | readout error does not scale with λ; leaving it inside the extrapolation makes the value-vs-λ curve non-affine and biases the intercept |
| **DD + ZNE** | fold → **re-schedule** → **re-insert DD** → execute → extrapolate | RECON-13. Folding creates new idle windows; a pre-fold DD schedule is invalid, and DD coverage that varies with λ breaks smooth scaling |
| twirling + ZNE | fold → twirl the *folded* circuit → split shots → average → extrapolate | twirling first and folding after re-introduces correlated structure across the folded copies |
| twirling + readout | **not generated** | zero modelled benefit (§5.3) |
| PEC + anything | **not generated** | PEC does not execute in V1 |

---

## 7. Example workloads must ship with an observable (RECON-14)

"Error" is undefined without one. Every §18 step-1 example declares an observable and a task type:

| workload | qubits | observable | task_type | notes |
|---|---|---|---|---|
| Bell state | 2 | `ZZ` (ideal ⟨O⟩ = +1) | `expectation_value` | smallest honest end-to-end case |
| Bell state (sampling) | 2 | — | `sampling_distribution` | demonstrates the ZNE-excluded branch |
| GHZ | 4 | `ZZZZ` (ideal ⟨O⟩ = +1) | `expectation_value` | parity observable; readout `V_amp` visibly bites |
| VQE-like ansatz | 4 | normalized 2-local Hamiltonian, ‖H‖ scaled to ⟨O⟩ ∈ [-1,1] | `expectation_value` | the realistic ZNE case |
| QAOA-like | 6 | normalized cost Hamiltonian | `expectation_value` | 2-qubit-gate dominated; PEC calculator gets interesting |
| Hardware-efficient random ansatz | 5 | `Z` on qubit 0 | `expectation_value` | knob for depth/idle-exposure sweeps |

Non-normalized Hamiltonians are normalized by ‖H‖₁ before any error figure is quoted, and the
normalization factor is reported alongside — otherwise "error 0.01" is meaningless.

---

## 8. Invariants this model must satisfy (§46)

For the test author. These are properties, not golden outputs.

1. `shot_multiplier >= 1.0` for every strategy, every input (§3).
2. `V_amp >= 1.0`; `stat_std` strictly decreases as `N_shots` increases, ∝ `1/sqrt(N)`.
3. `rmse == sqrt(bias_estimate² + stat_std²)` exactly, and `rmse >= max(|bias|, stat_std)`.
4. Zero-noise limit: with every ε = 0 and T2 = ∞, `bias_estimate == 0` for **every** strategy, and
   `rmse == stat_std`.
5. Monotonicity: increasing any ε with everything else fixed never decreases `bias_raw`.
6. No free lunch: no strategy has both `bias_estimate < raw` and `V_amp < raw`. Any strategy that
   reduces bias pays variance, job count, or runtime.
7. `raw` is always in the candidate set.
8. A technique whose matrix verdict is `incompatible` never appears in the candidate set, and
   therefore never in the recommendation (RECON-19).
9. DD with `idle_exposure == 0` is absent from the candidate set — **not** present with zero benefit.
10. No `twirling`-only or `twirling + readout` candidate is ever generated.
11. `pec_estimate` is present when its calculator preconditions hold, and is never `recommendable`.
12. ZNE is absent for every `sampling_distribution`, mid-circuit-measurement, reset, or dynamic
    circuit.
13. `strategy_confidence ∈ [0,1]` and `statistical_confidence ∈ [0,1]`, and they are never equal by
    construction (they are different quantities; a test that asserts they match is asserting the bug
    RECON-9 exists to prevent).
14. Every numeric output carries a `provenance`, and no QEM output ever carries `measured`.

---

## 9. Open dependencies

- **RECON-21 reason-code enum (Architect).** The matrix needs a `TECHNIQUE_NOT_IMPLEMENTED` code for
  PEC/CDR/PEA/symmetry/post-selection. Today those rules emit `UNSUPPORTED_CIRCUIT_FEATURE`, which
  is semantically wrong — the circuit is fine, the product is not. Requested in
  `proposed_reason_codes` in the matrix; harmless until granted.
- **`SCIENTIFIC_ASSUMPTIONS.md` (QEM half)** is not in this deliverable's scope; §2.2's assumption
  list and §5.7's constants are the material it will absorb.
- **HardwareProfile fields** this model reads must exist in the demo backends:
  `supports_delay_instruction`, `supports_scheduled_circuits`, `max_circuit_depth`,
  `max_circuits_per_job`, `t2_median_us`, plus per-gate error rates and per-qubit assignment error
  on the CalibrationSnapshot. Listed in the matrix's `backend_capabilities` block.
