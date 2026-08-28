# Scientific Assumptions

Every modelling assumption the platform relies on, stated so it can be attacked. Detail lives in
`QEM_METHODS.md` and `QEC_METHODS.md`; this is the consolidated, honest summary (MISSION §53–54).

## The rule that governs everything

**No number is presented as a measurement unless it was measured.** Every quantity crossing the API
carries a `provenance` of `measured | simulated | heuristic | demo_fixture | planning_estimate`, and
`DEMO_VS_REAL.md` is derived from that field. In this prototype **nothing is `measured`** — there is
no hardware in the loop.

## Error semantics

- `target_error` is **absolute error on a normalised observable ⟨O⟩ ∈ [−1, 1]**. Without fixing this,
  "error" is ambiguous and every comparison is meaningless.
- An example circuit **always ships with the observable it is measured against** — a Bell state with
  no observable has no defined error.
- **`target_error = 1e-5` is unreachable by QEM on NISQ hardware.** Two-qubit error is ~1e-3; shot
  noise alone would need ~1e10 shots and residual bias dominates regardless. The API keeps the
  signature, but preflight returns `TARGET_ERROR_UNLIKELY`, docs use 1e-2…1e-3, and any 1e-5 figure
  is labelled a QEC **planning estimate**.

## QEM assumptions

1. **Bias and variance are modelled separately.** A single scalar "expected error" hides the central
   trade-off: ZNE and PEC reduce *bias* while *increasing variance* at fixed shots, which would make
   ZNE look free. The optimizer consumes `rmse = √(bias² + std²)`; the UI shows both parts.
2. **Global-depolarising approximation** with a four-channel error budget (1Q, 2Q, idle, readout) and
   a per-technique residual factor per channel. Real device noise is coherent, correlated and
   non-Markovian — this model is a first-order stand-in, not a physical derivation.
3. **Technique honesty**, encoded in the compatibility matrix rather than prose:
   - *Twirling / randomised compiling is not a standalone strategy.* It converts coherent noise into
     stochastic Pauli noise; it does not reduce average error (it usually raises it slightly). Modelled
     as a **modifier** that enables/stabilises ZNE and PEC.
   - *ZNE* applies to expectation-value tasks only — never sampling tasks — and is invalid for
     dynamic/mid-circuit-measurement circuits, where folding breaks conditional causality. V1 uses
     digital gate folding (pulse stretching needs pulse-level access we do not have).
   - *DD+ZNE ordering matters*: DD must be re-inserted **after** folding, else folding scales the DD
     pulses and the noise-scaling assumption breaks.
   - *DD requires idle exposure > 0 and backend delay scheduling*; otherwise it is a no-op and is
     excluded rather than offered at zero benefit.
   - *Readout mitigation* is tensored/M3 only — a full 2ⁿ assignment matrix is unusable past ~10
     qubits — and its unfolding **inflates variance** (≥ 1, growing with readout error).
   - *PEC* is a **calculator only** in V1: the sampling overhead γ² grows exponentially with circuit
     size (~55 at 100 gates, ~2.2e4 at 250), so it is priced, never executed.
4. **Statistical vs strategy confidence are different things** and are reported separately.
   Frequentist coverage applies only to the sampling part; the model's confidence in its own
   heuristic is not a coverage claim.

## QEC assumptions

1. **Simulation, not hardware.** Stim circuits with a chosen noise model, decoded by PyMatching MWPM.
   Genuine Monte-Carlo results *of a model*.
2. Noise tiers are **generator knobs**, not device characterisations: code-capacity,
   phenomenological, circuit-level. Circuit-level is the most realistic and still idealised.
3. `rounds = d` for memory experiments; **Z-basis memory only** in V1.
4. **Surface-code MWPM requires `detector_error_model(decompose_errors=True)`** — omitting it silently
   mishandles Y errors and inflates the logical error rate. This is asserted in tests.
5. **Per-round normalisation** is applied; at `P_L ≥ 0.5` the per-round rate is **null, not NaN**.
6. **The repetition code has no true threshold** — it is labelled a bit-flip pseudo-threshold. Saying
   otherwise would be simply wrong.
7. **No threshold number is printed** from three distances; the crossing *region* is shown instead.
8. Wilson intervals throughout; `insufficient_statistics` is flagged below 50 observed errors rather
   than reported as a confident zero.
9. **Physical-qubit counts are structural** (2d−1 repetition, 2d²−1 rotated surface) — not a
   fault-tolerance resource estimate. Anything resembling one is labelled *planning estimate*.

## Optimizer assumptions

- Constraints are a **hard pre-filter**, not weight terms: no weighting can rescue a violated budget.
- Normalisation ranges are **fixed and documented**, so scores are comparable across runs. Per-batch
  min-max would silently change a plan's score depending on what it was compared against.
- The weighted sum is chosen for **auditability over sophistication**. It is not claimed to be
  optimal — it is claimed to be inspectable, which matters more when the inputs are heuristics.
- Explanations are template-generated from the structured breakdown. No LLM text in the product.

## Cost assumptions

Configuration-based pricing (provider × unit × shots × modelled seconds). No live pricing is
scraped. Every figure is labelled **estimated**; none has been reconciled against a real invoice.

## The honest summary

The **engines are real** (Stim/PyMatching simulation, matrix-driven compatibility, two-stage
optimisation). The **inputs are modelled** (noise, cost, calibration, devices). So the platform
demonstrates a defensible *decision procedure* — it does not yet demonstrate that its predictions
match hardware. Closing that gap needs one real provider adapter and measured runs; the data model
already preserves exactly what that comparison would require.
