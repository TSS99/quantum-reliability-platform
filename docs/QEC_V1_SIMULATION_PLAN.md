# QEC V1 Simulation Plan — fixture grid, dependencies, execution modes

Owner: QEC Scientist. Governed by **RECON-15/16/17/18** (`docs/PHASE1_RECONCILE.md`) and
`docs/MISSION.md` §23–27, §33, §34, §48, §49, §71. Method definitions live in
[`QEC_METHODS.md`](QEC_METHODS.md); this file is the **production and delivery contract**.

---

## 1. The constraint that shapes everything

GitHub Pages serves static files. Stim, PyMatching, and sinter are CPython wheels. **The deployed
prototype therefore cannot run a QEC simulation at all** (§48). The alternatives were: (a) fake it,
(b) ship a WASM/JS reimplementation, (c) precompute. (a) violates §71. (b) means hand-rolling a
stabilizer simulator and a decoder, which RECON-16 forbids for good reason. So: **(c) precompute a
seeded fixture grid through the real backend and commit it** (RECON-15).

Consequence: **there are exactly two execution modes for QEC in V1**, and every payload declares which
one produced it via `execution_mode` (RECON-8).

| Mode | Where | `execution_mode` | Capability |
|---|---|---|---|
| Pages / demo | static bundle, `DemoReliabilityDataSource` | `demo_replay` | reads the committed fixture grid; **cannot** compute an off-grid point |
| Local backend | `services/api` on a developer machine | `local_simulation` | arbitrary live sweeps via `POST /api/v1/qec/simulate` |

The demo and the live backend return the **same snake_case shape** (RECON-2), so the data-source swap
(§49) is byte-compatible. The fixture file *is* a captured API response set, not a parallel format.

---

## 2. Dependencies (RECON-16)

Backend-only, exact-pinned, never bundled into `apps/web`:

```
stim==1.16.0
pymatching==2.4.0
sinter==1.16.0
```

- Apache-2.0, pure wheels for CPython 3.11 — no compiler toolchain required.
- Declared in `services/api/pyproject.toml`; enforced by the RECON-29 ESLint
  `no-restricted-imports` boundary (`apps/web/**` may not reach `services/api/**`) and by the
  post-build `dist/` scan.
- `stim.__version__`, `pymatching.__version__`, `sinter.__version__` are recorded in the fixture
  manifest and in every live-simulation lineage record (§32).
- Nothing else is added for QEC. `numpy` arrives transitively; `scipy` is **not** required — the
  Wilson interval is ten lines (`QEC_METHODS.md` §6.3).

---

## 3. The fixture grid

### 3.1 Primary grid — `demo-data/qec/threshold_grid.json`

The RECON-15 contract, exactly: **2 codes × 3 distances × 3 noise tiers × 12 values of `p` = 216
rows**, decoder `mwpm_pymatching`, summary rows only.

| Axis | Values |
|---|---|
| `code` | `repetition`, `rotated_surface` |
| `distance` | 3, 5, 7 |
| `noise_model` | `code_capacity`, `phenomenological`, `circuit_level` |
| `rounds` | 1 for `code_capacity`, otherwise `= distance` |
| `decoder_id` | `mwpm_pymatching` |

`p` is 12 points, `geomspace(lo, hi, 12)` rounded to 4 significant figures, per tier — chosen to
bracket the d=3/5/7 crossing so the chart shows the crossing rather than one side of it:

| Tier | `lo` | `hi` |
|---|---|---|
| `code_capacity` | 0.01 | 0.20 |
| `phenomenological` | 0.003 | 0.06 |
| `circuit_level` | 0.0005 | 0.01 |

The literal 36 values are frozen in the manifest (§4) — the grid is data, not a formula the frontend
re-evaluates.

### 3.2 Companion slice — `demo-data/qec/decoder_comparison.json`

The Decoder Lab panel (RECON-22) needs a real decoder *comparison*, and the only honest one available
is repetition-code majority-vote vs MWPM (RECON-17). This is an **additive slice on the same axes**,
not a widening of the frozen grid: `repetition` × d∈{3,5,7} × `circuit_level` × the same 12 `p`
× `decoder_id = majority_vote` = **36 rows**. Every `NOT_IMPLEMENTED` decoder appears in this file as
a declared row with `null` metrics and a reason string — never a number (§27, §71).

**Total shipped: 252 summary rows.**

### 3.3 Row schema

One row is a flat record. Units and provenance are declared **once per file** in the header rather
than per scalar — see §7 for why this deviates from RECON-3's per-quantity wrapper and needs Architect
sign-off.

```jsonc
{
  "schema_version": "qec-fixture/1",
  "qrp_version": "0.1.0",
  "data_provenance": "simulated",
  "execution_mode": "demo_replay",
  "units": { "p": "probability_0_1", "logical_error_rate": "probability_0_1",
             "logical_error_rate_per_round": "probability_0_1",
             "detection_event_rate": "probability_0_1",
             "decoder_seconds_per_shot": "seconds", "physical_qubits": "count" },
  "manifest_ref": "demo-data/qec/manifest.json",
  "rows": [
    {
      "code": "rotated_surface", "distance": 5, "rounds": 5,
      "noise_model": "circuit_level", "p": 0.003484,
      "shots": 100000, "logical_errors": 412,
      "logical_error_rate": 0.00412, "ler_ci_low": 0.003742, "ler_ci_high": 0.004535,
      "logical_error_rate_per_round": 0.0008267,
      "lerpr_ci_low": 0.0007506, "lerpr_ci_high": 0.0009106,
      "detection_event_rate": 0.0271,
      "decoder_id": "mwpm_pymatching", "decoder_status": "REAL",
      "decoder_seconds_per_shot": 4.1e-05,
      "physical_qubits": 49,
      "insufficient_statistics": false,
      "threshold_semantics": "true_threshold"
    }
  ]
}
```

`threshold_semantics ∈ { "true_threshold", "pseudo_threshold_bitflip_only" }` — the repetition code
always gets the second value (`QEC_METHODS.md` §6.5). Values are illustrative of *shape*; the real
numbers come from the generator run.

### 3.4 Size budget

A row serialises to ≈ 340 bytes minified. 252 rows ≈ **86 KB**, plus a ≈ 6 KB manifest — comfortably
inside RECON-15's **≤ 200 KB**. The budget is enforced, not assumed: CI fails the build if
`demo-data/qec/*.json` exceeds 200 KB in total. If a future axis pushes past it, the fix is to drop
an axis, not to drop the CI check.

**Explicitly not shipped:** raw shot data, detection-event bitstrings, syndrome dumps, per-shot
timings, Stim circuits. Those are megabytes and no V1 screen consumes them.

---

## 4. Manifest — `demo-data/qec/manifest.json`

The reproducibility contract (§32, §33, RECON-15). Contains:

- `generated_at_utc`, `generator_script`, `generator_git_sha`
- `stim_version`, `pymatching_version`, `sinter_version`, `python_version`, `platform`
- `master_seed`, and the **per-task seed derivation rule**
  (`seed = master_seed + index(code, distance, noise_model, p, decoder)`, the index frozen in the file)
- the literal `p` grids per tier, the shot budget, and the axis lists
- `row_count` and a SHA-256 of each fixture file
- `method_ref: "docs/QEC_METHODS.md"`

A reader with this repo, these pinned versions, and this manifest can regenerate the grid and diff it.
That is the whole point of committing it.

---

## 5. Generation

### 5.1 Script

`scripts/generate_qec_fixtures.py` — committed, deterministic, no network.

It **calls the backend service layer** (`services/api/.../qec/`), the same code path
`POST /api/v1/qec/simulate` uses. It does not contain its own simulation logic. If the fixture
generator and the live endpoint could disagree, the demo would be a lie by construction; sharing the
code path makes that impossible.

Per grid point:

1. build the circuit and DEM per `QEC_METHODS.md` §3–§4 (`decompose_errors=True`);
2. collect via `sinter.collect(num_workers=1, tasks=…, decoders=["pymatching"], max_shots=100_000,
   max_errors=1_000)`;
3. compute Wilson CIs and per-round normalisation locally (`QEC_METHODS.md` §6) — QRP owns that math
   so it is testable;
4. emit the row.

**Shot budget:** `max_shots=100_000`, `max_errors=1_000`. Above threshold the run stops early on
errors; below threshold it caps at 100 k shots and may observe `k < 50`, which sets
`insufficient_statistics` (`QEC_METHODS.md` §6.4). That outcome is **reported, not hidden and not
back-filled** — the low-`p`, high-`d` corner is genuinely beyond a laptop-scale budget, and saying so
is more useful than a fabricated point.

**Wall-clock:** worst case 252 × 100 k = 25.2 M shots; dominated by d=7 circuit-level decoding.
Single-process budget ≈ 30–60 min on a developer laptop. This is a one-off committed artefact, not a
CI job.

### 5.2 Determinism and its honest limits

- `num_workers=1` and explicit per-task seeds. sinter's sharding across workers changes how shots are
  batched, so a multi-worker run is **not** guaranteed bitwise identical; the generator pins one
  worker so the artefact is reproducible.
- Reproducibility is claimed **for these pinned library versions on the same platform**. A stim
  upgrade may legitimately change sampled bits. That is why versions are in the manifest and the deps
  are exact-pinned.
- CI does **not** regenerate the grid (too slow). It verifies the committed SHA-256s, the schema, the
  size budget, and the §8 invariants. A regeneration diff is a manual, reviewed step.

---

## 6. Consumption contract (what Frontend and Architect must honour)

1. **The grid is authoritative and finite.** The demo data source resolves a QEC request by exact
   match on `(code, distance, noise_model, p, decoder_id)`.
2. **Off-grid ⇒ "not in demo dataset."** No interpolation, no nearest-neighbour substitution, no
   silent snapping (RECON-15). The response is a structured §43 error carrying the reason code and
   the available grid values for the axis that missed, so the UI can offer the nearest *real* points
   as choices rather than inventing a value.
   → *Proposed reason code `DEMO_FIXTURE_MISS`, to be added to the RECON-21 shared enum. Architect
   co-owns that module; flagged for sign-off, not assumed.*
3. **UI controls are constrained to the grid** in demo mode — a `p` slider becomes a stepped control
   over the 12 committed values. A control that can request a point that cannot exist is a dead
   control (§71). The off-grid error path still exists as a guard, but the UI should not be able to
   reach it.
4. **Live sweeps are local-backend only.** The Pages build never renders a "run simulation" affordance
   that cannot run; it renders the grid and states that live sweeps require the local backend.
5. **`data_provenance` and `execution_mode` are carried through to render**, not stripped at the
   boundary (RECON-18). `DEMO_VS_REAL.md` is generated from them (RECON-4), which means dropping them
   silently degrades a shipped document — another reason they are payload fields.

---

## 7. Deviation flagged for Architect sign-off

RECON-3 wraps **every numeric quantity crossing the API** as
`{ value, unit, provenance, method_ref }`. Applied per scalar to a dense numeric series, that
multiplies the fixture by roughly 6–8×, i.e. **0.5–0.7 MB against a 200 KB budget** — the two frozen
decisions are in direct tension here.

**Proposed resolution (this plan is written against it):** the wrapper stays mandatory for scalar
domain quantities on the nine Flow-A objects (RECON-6); a **dense series** instead carries one
file/response-level descriptor — `units` map, `data_provenance`, `execution_mode`, `method_ref` — that
applies to every row, with rows as flat numerics. No information is lost; it is declared once instead
of 5 000 times.

This is a genuine cross-cutting contract change, so it is raised rather than absorbed. If the
Architect rules for per-scalar wrapping, the grid must shrink (drop the companion slice and one noise
tier) to stay under 200 KB — the size budget is the harder constraint of the two.

---

## 8. Acceptance criteria

The QEC V1 simulation layer is done when:

1. `scripts/generate_qec_fixtures.py` runs end-to-end from a clean checkout and writes
   `threshold_grid.json`, `decoder_comparison.json`, and `manifest.json`.
2. Total `demo-data/qec/` payload ≤ 200 KB, enforced in CI.
3. Every row validates against the schema; every committed SHA-256 matches.
4. All ten invariants in `QEC_METHODS.md` §8 pass against the committed grid.
5. Surface-code DEM construction uses `decompose_errors=True`, asserted by a test that fails if the
   flag is removed.
6. Every `NOT_IMPLEMENTED` decoder row has `null` metrics — no exceptions, verified by test.
7. `POST /api/v1/qec/simulate` on the local backend returns the same shape for an on-grid request as
   the fixture row, field for field.
8. An off-grid demo request returns a structured error listing available grid values — never a number.
9. The Pages build contains no Python, no `stim`/`pymatching`/`sinter`, and no live-sweep control.

---

## 9. Out of scope for V1 (documented, not built)

Larger distances, even distances, X-basis and stability experiments, biased/correlated/leakage noise,
SI1000 and vendor-calibrated noise models, BP / BP-OSD / Union-Find / GPU decoders, correlated
matching, real-time decoding latency measurement, multi-logical-qubit layouts, magic-state
distillation, and the §55–57 edge-QEC control plane. Each appears in the UI, if at all, as a declared
`NOT_IMPLEMENTED` entry with no number attached.
