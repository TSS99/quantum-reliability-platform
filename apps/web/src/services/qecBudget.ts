/**
 * The missing layer between QEM and QEC.
 *
 * A QEM target is an ABSOLUTE ERROR ON AN OBSERVABLE: |⟨O⟩_est − ⟨O⟩_ref| ≤ ε, with ⟨O⟩ ∈ [−1, 1].
 * A QEC grid point is a PER-ROUND LOGICAL ERROR RATE. Those are different physical quantities in
 * different units, and the escalation path previously carried ε straight across and relabelled it
 * "target per round". That comparison was meaningless — a small ε does not imply the same number
 * as a per-round logical error budget, and the direction of the error is not even the same.
 *
 * This module does the conversion explicitly, in three stated steps, so the assumption is visible
 * and arguable rather than hidden in a URL parameter:
 *
 *   1. ALLOWED FAILURE PROBABILITY.  Treat a logical failure as corrupting the estimate. For an
 *      observable normalised to [−1, 1] the worst-case swing from a corrupted result is 2, so a
 *      failure probability P contributes at most 2P to the observable error. Requiring that
 *      contribution to stay inside the target gives P_fail ≤ ε / 2.
 *
 *   2. LOGICAL VOLUME.  The computation must survive every logical operation, so the budget is
 *      spread over the whole run: N_L = logical qubits × logical depth × syndrome rounds per layer.
 *
 *   3. PER-ROUND BUDGET.  p_L ≲ P_fail / N_L — a union bound. It is deliberately conservative:
 *      it assumes failures add, which over-counts when they partially cancel.
 *
 * WHAT THIS IS NOT: a fault-tolerance resource estimate. There is no magic-state distillation
 * here, no routing overhead, no decoder latency, no space-time trade. It is a first-order budget
 * whose purpose is to make the QEM→QEC handoff dimensionally honest, and every consumer is
 * expected to label it as such.
 */

export interface LogicalBudgetInput {
  /** QEM target: absolute error on an observable in [-1, 1]. */
  targetObservableError: number;
  /** Logical qubits the encoded computation needs. Defaults to the circuit's qubit count. */
  logicalQubits: number;
  /** Logical circuit depth — layers of logical operations. */
  logicalDepth: number;
  /**
   * Syndrome-extraction rounds per logical layer. Convention here is d rounds per layer for a
   * distance-d code, which is the usual choice for tolerating measurement error.
   */
  roundsPerLayer: number;
}

export interface LogicalBudget {
  /** Allowed total probability that the logical computation fails. */
  failureProbability: number;
  /** N_L — logical operations × syndrome rounds the budget is spread across. */
  logicalVolume: number;
  /** The per-round logical error rate a code must achieve. This is what QEC data is compared to. */
  perRoundBudget: number;
  /** Human-readable derivation, rendered next to the number so it can be challenged. */
  steps: string[];
}

/** Worst-case swing of an observable normalised to [-1, 1] when a result is corrupted. */
const OBSERVABLE_RANGE = 2;

export function logicalBudget({
  targetObservableError,
  logicalQubits,
  logicalDepth,
  roundsPerLayer,
}: LogicalBudgetInput): LogicalBudget {
  const failureProbability = targetObservableError / OBSERVABLE_RANGE;
  const logicalVolume = Math.max(1, logicalQubits * logicalDepth * roundsPerLayer);
  const perRoundBudget = failureProbability / logicalVolume;

  return {
    failureProbability,
    logicalVolume,
    perRoundBudget,
    steps: [
      `ε = ${targetObservableError.toExponential(1)} absolute error on ⟨O⟩ ∈ [−1, 1]`,
      `P_fail ≤ ε / ${OBSERVABLE_RANGE} = ${failureProbability.toExponential(1)}`,
      `N_L = ${logicalQubits} qubits × ${logicalDepth} layers × ${roundsPerLayer} rounds/layer = ${logicalVolume.toLocaleString()}`,
      `p_L ≲ P_fail / N_L = ${perRoundBudget.toExponential(1)} per round`,
    ],
  };
}

export type TargetVerdict = 'meets' | 'likely' | 'miss' | 'unknown';

/**
 * Does a measured grid point meet a per-round budget?
 *
 * Uses the UPPER CONFIDENCE BOUND, not the point estimate. Zero observed failures gives a point
 * rate of exactly 0, which would otherwise pass every target no matter how few shots were run —
 * the plot already refuses to draw that as a value, and the planner must not assert it either.
 *
 *   meets   — the 95% upper bound clears the budget. A claim that survives scrutiny.
 *   likely  — the point estimate clears it but the upper bound does not. More statistics needed.
 *   miss    — even the point estimate does not clear it.
 */
export function verdictFor(
  pointRate: number | null,
  upperBound: number | null,
  budget: number,
): TargetVerdict {
  if (pointRate == null) return 'unknown';
  if (upperBound != null && upperBound <= budget) return 'meets';
  if (pointRate <= budget) return 'likely';
  return 'miss';
}

export const VERDICT_LABEL: Record<TargetVerdict, string> = {
  meets: 'meets target',
  likely: 'needs more statistics',
  miss: 'predicted miss',
  unknown: 'no data',
};
