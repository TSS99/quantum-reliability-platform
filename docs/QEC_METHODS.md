# QEC Scientific Model — V1

Owner: QEC Scientist. Governed by `docs/PHASE1_RECONCILE.md` (**RECON-15/16/17/18**) and
`docs/MISSION.md` §23–27, §53–54, §71. Where MISSION and RECON differ, RECON wins.

This document specifies **what QRP computes and how**, so that every number surfaced in the QEC Lab,
the Decoder Lab panel, and the QEC Code Planner is traceable to a stated method. The companion
`docs/QEC_V1_SIMULATION_PLAN.md` specifies **how those numbers are produced and shipped**.

**Non-goals for V1 (stated up front, not discovered later):** no hand-rolled stabilizer simulator, no
hand-built syndrome circuits, no hand-built detector error model, no hand-built matching graph, no
hand-rolled MWPM. All of that comes from Stim / PyMatching (RECON-16). No magic-state distillation, no
lattice surgery, no logical gates — V1 simulates **quantum memory only**.

---

## 1. Scope matrix

| Axis | V1 scope | Excluded from V1 |
|---|---|---|
| Code family | Repetition (`repetition_code:memory`), rotated surface (`surface_code:rotated_memory_z`) | Unrotated surface, colour, qLDPC, Bacon-Shor |
| Distance | d ∈ {3, 5, 7} | d ≥ 9 (grid cost), even d |
| Rounds | `rounds = d` (phenomenological, circuit-level); `rounds = 1` (code-capacity) | Arbitrary round counts |
| Noise tier | code-capacity, phenomenological, circuit-level | Biased/correlated noise, leakage, crosstalk, drift |
| Decoder | MWPM (PyMatching) — real; repetition majority-vote — real, optional | BP, BP-OSD, Union-Find, GPU, custom (declared, not implemented) |
| Experiment | Memory (Z-basis logical observable) | Stability experiments, logical gates, X-basis sweeps |
| Logical qubits | 1 | Multi-patch |

Everything in the "Excluded" column that the UI names is a `NOT_IMPLEMENTED` reference entry, never a
row with a number in it (§27, §71).

---

## 2. Code families

### 2.1 Repetition code (`repetition_code:memory`)
- Classical-style code embedded in a quantum circuit. Protects **bit-flip errors only**; phase errors
  are undetected by construction.
- Physical qubits at distance d: `d` data + `(d-1)` measure = **2d − 1** (d=3→5, d=5→9, d=7→13).
- Logical observable: Z-basis parity of the data measurements at the end of the memory experiment.
- **Why it stays in V1:** it is the pedagogically honest baseline, it is the one code where a second
  *real* decoder (majority vote) is trivially correct, and its failure mode (no phase protection)
  makes the surface code's value legible.

### 2.2 Rotated surface code (`surface_code:rotated_memory_z`)
- The genuine QEC content of the product. One Stim generator call — nothing is hand-built.
- Physical qubits at distance d: `d²` data + `(d² − 1)` measure = **2d² − 1** (d=3→17, d=5→49,
  d=7→97).
- Logical observable: the Z logical operator of the rotated patch, as emitted by the generator.
- V1 fixes the memory basis to **Z**. `rotated_memory_x` is symmetric under the noise models we ship
  and would double the grid for no new information; that is a scope decision, not a claim of
  equivalence, and it is recorded in `SCIENTIFIC_ASSUMPTIONS.md`.

### 2.3 Physical-qubit accounting (what the Planner may claim)
The counts above are **memory-patch counts for one logical qubit**. They exclude routing space, magic
state factories, the classical decoding fabric, and any multi-logical-qubit layout. Every physical
qubit estimate the Planner emits carries `provenance: "planning_estimate"` and this caveat inline
(§25, §71). QRP does not present `2d² − 1` as a full-stack resource estimate.

---

## 3. Noise tiers

All three tiers are driven by **one scalar knob `p`** so the threshold plot has a well-defined x-axis.
The tiers are realised through `stim.Circuit.generated(...)` parameters — no circuit editing.

| Tier | `before_round_data_depolarization` | `before_measure_flip_probability` | `after_reset_flip_probability` | `after_clifford_depolarization` | rounds |
|---|---|---|---|---|---|
| `code_capacity` | `p` | 0 | 0 | 0 | 1 |
| `phenomenological` | `p` | `p` | 0 | 0 | `d` |
| `circuit_level` | `p` | `p` | `p` | `p` | `d` |

**Documented honesty notes (these are the approximations §54 forbids hiding):**

1. **`code_capacity` is a proxy, not the textbook model.** The textbook model applies one round of
   data noise to a perfect code state and decodes a noiseless syndrome. We approximate it with the
   generated `rounds=1` circuit and all measurement/reset/gate noise set to zero. The residual
   difference is the ideal encoding/readout circuit itself, which is noiseless here. Labelled
   `code_capacity (rounds=1 proxy)` in the UI.
2. **`p` is the generator knob, not a marginal error rate.** `DEPOLARIZE1(p)` produces X, Y, or Z each
   with probability `p/3`. For the repetition code (Z-basis observable) the effective marginal
   bit-flip rate is therefore `2p/3`, not `p`; for the surface code `p` induces correlated X/Z
   components. **The x-axis of every chart is the knob `p`**, labelled *"noise-model parameter p"* —
   never "physical error rate" unqualified. Both `p` and the tier name travel in the payload so a
   reader can reconstruct the model.
3. **`circuit_level` is the uniform-`p` depolarizing model**, not SI1000 and not a vendor calibration.
   It is not claimed to reproduce any real device.
4. **No leakage, crosstalk, non-Markovian noise, or drift.** Their absence biases logical error rates
   **optimistically**. Stated wherever a threshold is shown.

---

## 4. Syndrome representation and decoding

QRP decodes the **detector error model**, not a hand-built graph.

1. `circuit = stim.Circuit.generated(<code>, rounds=…, distance=d, <noise kwargs>)`
2. `dem = circuit.detector_error_model(decompose_errors=True)` — **mandatory for the surface code**
   (RECON-17). Without `decompose_errors=True` the DEM contains hyperedges that a matching decoder
   cannot represent; Y-type errors are then silently mishandled and the reported logical error rate is
   wrong. This flag is asserted in a unit test, not left to convention.
3. `sampler = circuit.compile_detector_sampler(seed=…)` → `(detection_events, observable_flips)`.
4. `matcher = pymatching.Matching.from_detector_error_model(dem)` → `predictions`.
5. A shot is a **logical error** iff `predictions != observable_flips`.

*Syndrome semantics:* a Stim **detector** is a deterministic parity of measurement outcomes (for
repeated stabilizer rounds, the parity of the same stabilizer in consecutive rounds), so detection
events are the standard space-time syndrome differences. **Detectors are not raw stabilizer
measurements**, and the UI's "syndrome statistics" panel says so — it reports detection-event density
(mean fraction of detectors that fire), which is the quantity that is actually comparable across
codes, distances, and tiers.

---

## 5. Decoder scope (RECON-17)

| `decoder_id` | Status | Implementation | Reported latency |
|---|---|---|---|
| `mwpm_pymatching` | **REAL** | `pymatching==2.4.0` sparse blossom, from the decomposed DEM | measured |
| `majority_vote` | **REAL** (repetition code only) | majority vote over the decoded data-qubit parity; rejected for surface code with `QEC_CAPABILITY_MISSING` | measured |
| `bp` | `NOT_IMPLEMENTED` | reference entry | `null` |
| `bp_osd` | `NOT_IMPLEMENTED` | reference entry | `null` |
| `union_find` | `NOT_IMPLEMENTED` | reference entry | `null` |
| `gpu_decoder` | `NOT_IMPLEMENTED` | reference entry | `null` |
| `custom` | `NOT_IMPLEMENTED` | plugin seam only | `null` |

**Hard rule (§27, §71):** a `NOT_IMPLEMENTED` decoder returns `null` for every metric — logical error
rate, latency, throughput, memory, success rate. It never returns an estimate, an interpolation, a
literature value, or a placeholder. The Decoder Lab panel renders those rows as declared-but-not-run,
with the reason string carried in the payload.

**Decoder latency semantics.** `decoder_seconds_per_shot` is **batch wall-clock ÷ shots on the fixture
generation machine**, single process. It is *throughput*, not real-time decoding latency, and it is
not a claim about any FPGA/ASIC decoding budget (§55–57 is explicitly future work). The payload field
is named for what it is and the UI never labels it "latency" without the batch qualifier.

---

## 6. Logical error rate methodology (RECON-18)

Let `n` = shots at a grid point and `k` = shots where `predictions != observable_flips`.

### 6.1 Per-experiment rate
`P_L = k / n` — the probability that the whole `rounds`-round memory experiment fails.

### 6.2 Per-round normalisation — **required**
Comparing distances or tiers with different round counts using `P_L` is the single most likely bug in
this feature. QRP always also computes:

```
p_round = (1 - (1 - 2 * P_L) ** (1 / rounds)) / 2
```

This inverts the composition of `rounds` independent Bernoulli(p_round) flips. Notes:
- For `rounds = 1` (code-capacity) it reduces to `p_round = P_L`, as it must.
- It is only defined for `P_L < 0.5`. At `P_L ≥ 0.5` the code is deep past threshold and the
  quantity is meaningless: QRP emits `null` with `reason: "beyond_random_guessing"` rather than a
  NaN or a clamped value.
- **Both** `logical_error_rate` (per experiment) and `logical_error_rate_per_round` ship in the
  payload; the chart states which one it is plotting in its required `summary` prop (RECON-27).

### 6.3 Uncertainty — Wilson score interval, 95%
Normal-approximation ("Wald") intervals are wrong exactly where this product lives: small `k`, small
`P_L`. QRP uses the Wilson score interval with `z = 1.96`:

```
denom  = n + z**2
centre = (k + z**2 / 2) / denom
half   = (z / denom) * sqrt(k * (n - k) / n + z**2 / 4)
ci     = (max(0, centre - half), min(1, centre + half))
```

The per-round CI is obtained by applying §6.2's transform to each endpoint — valid because the
transform is monotone increasing in `P_L` on `[0, 0.5)`.

### 6.4 Insufficient-statistics flag
`insufficient_statistics = (k < 50)`. When set:
- the point renders as an **upper bound**, not a value (at `k = 0` the Wilson upper bound is the only
  meaningful output);
- it is excluded from any crossing-band estimate (§6.5);
- it is visually distinguished by **shape and text**, not colour alone (RECON-27).

### 6.5 Threshold presentation — what QRP may and may not say
- **Never print a single threshold number from three distances.** Three distances with finite shot
  counts do not support a finite-size-scaling fit. QRP shows the **crossing band**: the interval of
  `p` within which the d=3/5/7 curves (with their CIs) intersect, labelled *"crossing region —
  not a fitted threshold"*.
- **The repetition code has no true threshold** in the sense the surface code does: it corrects one
  error class only, so it never protects a logical *qubit*. Its curves are labelled
  **"pseudo-threshold — bit-flip protection only"** and the UI states that phase errors are
  uncorrected. This label is a payload field (`threshold_semantics`), not UI-only prose.
- **`data_provenance: "simulated"`** is a required field on every QEC payload (RECON-18, RECON-3), not
  merely a badge. A consumer that drops the badge still cannot lose the provenance.
- The "Simulated" label is rendered prominently on the chart itself (§24), and `execution_mode`
  distinguishes `demo_replay` from `local_simulation` (RECON-8).

---

## 7. Reported quantities

Per grid point / per simulation run:

| Field | Meaning | Unit |
|---|---|---|
| `code`, `distance`, `rounds`, `noise_model`, `p` | configuration | — |
| `shots`, `logical_errors` | sampling budget and outcome | count |
| `logical_error_rate` + `ci_low`/`ci_high` | §6.1, §6.3 | probability 0–1 |
| `logical_error_rate_per_round` + CI | §6.2 | probability 0–1 |
| `detection_event_rate` | mean fraction of detectors firing | probability 0–1 |
| `decoder_id`, `decoder_status` | §5 | — |
| `decoder_seconds_per_shot` | §5 batch throughput | seconds |
| `physical_qubits` | §2.3 memory-patch count | count |
| `insufficient_statistics`, `threshold_semantics` | §6.4, §6.5 | — |
| `data_provenance`, `execution_mode` | `"simulated"`, RECON-8 enum | — |
| `stim_version`, `pymatching_version`, `sinter_version`, `seed` | lineage (§32, RECON-16) | — |

Probabilities are `0–1` on the wire; percent formatting is a UI concern only (RECON-3).

---

## 8. Scientific invariants (feed §46 tests)

These are properties, not golden outputs. QA implements them against the fixture grid and the live
local backend.

1. **Zero-noise limit:** `p = 0` ⇒ `logical_errors == 0` for every code, distance, and tier.
2. **Monotonicity in aggregate:** over the full grid, `logical_error_rate` is non-decreasing in `p`
   for fixed (code, d, tier) up to sampling noise — tested as "no CI-disjoint decrease".
3. **Distance helps below threshold:** for the surface code at the smallest `p` in each tier where all
   three distances have `k ≥ 50`, `LER(d=7) < LER(d=5) < LER(d=3)` with disjoint CIs.
4. **Distance hurts above threshold:** the ordering in (3) reverses at the largest `p` in each tier.
5. **More shots ⇒ tighter CI:** Wilson half-width shrinks ~`1/sqrt(n)`.
6. **Determinism:** same seed + same pinned versions ⇒ identical `logical_errors`.
7. **Decomposition guard:** constructing a `Matching` for the surface code from a DEM built with
   `decompose_errors=False` raises — asserted so the flag can never silently regress.
8. **Impossible configs rejected:** even distance, `d < 3`, `rounds < 1`, `p ∉ [0, 1]`,
   `majority_vote` + surface code ⇒ structured §43 error with a RECON-21 reason code, never a result.
9. **No fabricated rows:** every `NOT_IMPLEMENTED` decoder yields `null` metrics.
10. **Per-round identity:** for `rounds = 1`, `logical_error_rate_per_round == logical_error_rate`.

---

## 9. Known limitations (surface these, do not bury them)

- Memory experiments only; no logical operations, so nothing here estimates the cost of an algorithm.
- Uniform depolarizing noise; no leakage, crosstalk, correlated or non-Markovian noise, no drift.
  All of these make the reported logical error rates **optimistic**.
- One logical qubit, Z-basis only.
- MWPM is not an optimal decoder; a better decoder (BP-OSD, correlated matching) would lower these
  curves. Reported crossings are **decoder-specific**, and labelled as such.
- Three distances cannot yield a fitted threshold (§6.5).
- Physical-qubit counts are memory-patch counts (§2.3).
- `decoder_seconds_per_shot` is batch throughput on one machine (§5), not device latency.

---

## 10. References

- Stim — C. Gidney, *Stim: a fast stabilizer circuit simulator*, Quantum 5, 497 (2021).
- PyMatching 2 — O. Higgott & C. Gidney, *Sparse Blossom: correcting a million errors per core second
  with minimum-weight matching* (2023).
- Surface codes — A. Fowler, M. Mariantoni, J. Martinis, A. Cleland, *Surface codes: Towards practical
  large-scale quantum computation*, PRA 86, 032324 (2012).
- Wilson interval — E. B. Wilson, *Probable inference, the law of succession, and statistical
  inference*, JASA 22, 209 (1927).

Citations are for method provenance. **No number in QRP is taken from a paper** — every value shown is
produced by the pinned toolchain on this machine, or is `null`.
