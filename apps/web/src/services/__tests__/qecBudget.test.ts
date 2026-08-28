import { describe, expect, it } from 'vitest';
import { logicalBudget, verdictFor } from '../qecBudget';
import { optimize, DEFAULT_GOAL } from '../demoEngine';
import { BACKENDS, CALIBRATIONS, CIRCUIT_PROFILES } from '../demoFixtures';
import { validateObservable } from '../qasm';

/**
 * These cover three corrections that were, individually, ways of stating something false:
 * comparing an observable error to a logical error rate, calling a zero-failure point a pass, and
 * scoring a sampling task with an expectation-value model.
 */
describe('QEM target to logical error budget', () => {
  it('is far stricter than the raw observable target', () => {
    const b = logicalBudget({
      targetObservableError: 0.02,
      logicalQubits: 4,
      logicalDepth: 26,
      roundsPerLayer: 7,
    });
    // The old code compared 0.02 directly against a per-round rate. The real budget is orders of
    // magnitude smaller, because the run has to survive every round.
    expect(b.perRoundBudget).toBeLessThan(0.02 / 100);
    expect(b.failureProbability).toBeCloseTo(0.01, 12);
    expect(b.logicalVolume).toBe(4 * 26 * 7);
    expect(b.perRoundBudget).toBeCloseTo(0.01 / (4 * 26 * 7), 15);
  });

  it('spreads the budget over the logical volume, so a bigger circuit demands a lower rate', () => {
    const small = logicalBudget({ targetObservableError: 0.02, logicalQubits: 2, logicalDepth: 3, roundsPerLayer: 7 });
    const large = logicalBudget({ targetObservableError: 0.02, logicalQubits: 6, logicalDepth: 34, roundsPerLayer: 7 });
    expect(large.perRoundBudget).toBeLessThan(small.perRoundBudget);
  });

  it('shows its derivation so the assumption can be challenged', () => {
    const b = logicalBudget({ targetObservableError: 0.02, logicalQubits: 2, logicalDepth: 3, roundsPerLayer: 7 });
    expect(b.steps).toHaveLength(4);
    expect(b.steps.join(' ')).toMatch(/P_fail/);
    expect(b.steps.join(' ')).toMatch(/N_L/);
  });

  it('never returns a non-positive volume', () => {
    const b = logicalBudget({ targetObservableError: 0.02, logicalQubits: 0, logicalDepth: 0, roundsPerLayer: 0 });
    expect(b.logicalVolume).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(b.perRoundBudget)).toBe(true);
  });
});

describe('target verdicts use the confidence bound', () => {
  it('does NOT call zero observed failures a pass on the point estimate alone', () => {
    // 0 failures gives a point rate of exactly 0, which would clear any target. The upper bound is
    // what actually carries the claim.
    expect(verdictFor(0, 1e-3, 1e-4)).toBe('likely');
  });

  it('passes only when the upper bound clears the budget', () => {
    expect(verdictFor(0, 5e-5, 1e-4)).toBe('meets');
  });

  it('fails when even the point estimate misses', () => {
    expect(verdictFor(2e-4, 9e-4, 1e-4)).toBe('miss');
  });

  it('reports unknown rather than guessing when there is no rate', () => {
    expect(verdictFor(null, null, 1e-4)).toBe('unknown');
  });
});

describe('task type gates the optimizer', () => {
  const profile = CIRCUIT_PROFILES.bell_pair!;

  it('refuses a sampling task instead of scoring it with the observable model', () => {
    const res = optimize(profile, BACKENDS, CALIBRATIONS, {
      ...DEFAULT_GOAL,
      task: { type: 'sampling', metric: 'total_variation_distance', observable: null },
    });
    expect(res.unsupported?.code).toBe('TASK_TYPE_UNSUPPORTED');
    expect(res.plans).toHaveLength(0);
    expect(res.recommended_plan_id).toBeNull();
  });

  it('still answers an observable task', () => {
    const res = optimize(profile, BACKENDS, CALIBRATIONS, DEFAULT_GOAL);
    expect(res.unsupported).toBeUndefined();
    expect(res.plans.length).toBeGreaterThan(0);
  });
});

describe('observable validation', () => {
  it('accepts a Pauli string of the right width', () => {
    expect(validateObservable('ZZ', 2)).toEqual({ ok: true });
    expect(validateObservable('zz', 2)).toEqual({ ok: true });
  });

  it('rejects non-Pauli symbols', () => {
    const r = validateObservable('ABCDEF', 6);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Pauli/);
  });

  it('rejects a width mismatch', () => {
    const r = validateObservable('ZZ', 8);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/8/);
  });

  it('rejects empty input', () => {
    expect(validateObservable('   ', 2).ok).toBe(false);
  });
});
