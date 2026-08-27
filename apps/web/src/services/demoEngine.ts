// The demo engine: the client-side stand-in for the Phase-5/6 backend engines.
//
// Everything here is an EXPLICITLY HEURISTIC model, written out so it can be argued with. No
// value it returns claims to be a measurement; every Quantity it mints carries
// `provenance: 'heuristic'`. When ApiReliabilityDataSource lands, this module is replaced
// wholesale — the UI binds to the contract shapes, never to these functions.
//
// The models, stated plainly:
//
//   error budget      lambda = n_2q*p_2q + n_1q*p_1q + n_meas*p_ro + idle_exposure*lambda_gate/2
//                     bias   = 1 - exp(-lambda)            (monotone map of a rate into [0,1))
//   mitigation        each strategy multiplies the gate / readout / idle terms of lambda by a
//                     fixed residual factor. Techniques compose multiplicatively per channel,
//                     which is why stacking three of them does not simply add their benefits.
//   statistics        every technique that resamples the circuit amplifies variance:
//                     sigma = sqrt(variance_amplification / shots)
//   reported error    rmse = sqrt(bias^2 + sigma^2)  — bias and variance both, never bias alone,
//                     because "reduces bias, explodes variance" is the whole PEC story.
//   cost              qpu_seconds = shots * overhead * (reset_readout + depth * gate_time)
//                     cost_usd    = qpu_seconds * backend.cost_per_qpu_second_usd

import type {
  CalibrationSnapshot,
  CircuitProfile,
  ExcludedStrategy,
  ExecutionPlan,
  Finding,
  HardwareProfile,
  MitigationStrategy,
  OptimizeResponse,
  PreflightVerdict,
  ReliabilityGoal,
  ScoreBreakdown,
} from './contracts';
import { statusFromFindings } from './contracts';
import { STRATEGY_CATALOG, q } from './demoFixtures';

const METHOD_REF = 'apps/web/src/services/demoEngine.ts';
export const NORMALIZATION_REF = 'docs/API_CONTRACT.md#normalization';

/** Seconds of QPU time per shot that are not gate time: reset plus readout. */
const RESET_READOUT_SECONDS = 5.0e-4;
const GATE_TIME_SECONDS = 4.0e-7;

export const DEFAULT_SHOTS = 20_000;

export const PRESET_WEIGHTS: Record<string, Record<string, number>> = {
  minimize_cost: { error: 0.25, cost: 0.55, time: 0.2, qubit_overhead: 0, decoder_latency: 0 },
  balanced: { error: 0.4, cost: 0.35, time: 0.25, qubit_overhead: 0, decoder_latency: 0 },
  maximize_accuracy: { error: 0.7, cost: 0.15, time: 0.15, qubit_overhead: 0, decoder_latency: 0 },
};

export const DEFAULT_GOAL: ReliabilityGoal = {
  target_error: 0.02,
  statistical_confidence: 0.95,
  max_cost_usd: 80,
  max_runtime_seconds: 600,
  priority: 'balanced',
};

// ------------------------------------------------------------------ residuals

interface Residual {
  gate: number;
  readout: number;
  idle: number;
  /** Multiplies the per-shot variance of the estimator. 1 = no resampling penalty. */
  variance_amplification: number;
  /** How much the model trusts the technique's own assumptions, 0-1 (RECON-9: this is
   *  strategy_confidence and is reported separately from statistical_confidence). */
  strategy_confidence: number;
}

const RESIDUALS: Record<string, Residual> = {
  none: { gate: 1, readout: 1, idle: 1, variance_amplification: 1, strategy_confidence: 1 },
  readout_tensored: { gate: 1, readout: 0.25, idle: 1, variance_amplification: 1.15, strategy_confidence: 0.9 },
  dd_xy4: { gate: 1, readout: 1, idle: 0.35, variance_amplification: 1, strategy_confidence: 0.8 },
  zne_richardson_3: { gate: 0.35, readout: 1, idle: 1, variance_amplification: 6.5, strategy_confidence: 0.72 },
  zne_exponential_5: { gate: 0.28, readout: 1, idle: 1, variance_amplification: 18, strategy_confidence: 0.55 },
  zne_dd_readout: { gate: 0.35, readout: 0.25, idle: 0.35, variance_amplification: 7.4, strategy_confidence: 0.68 },
  pec_full: { gate: 0.08, readout: 0.25, idle: 1, variance_amplification: 118, strategy_confidence: 0.6 },
  qec_surface_d3: { gate: 0.02, readout: 0.1, idle: 0.2, variance_amplification: 1, strategy_confidence: 0.4 },
};

const FALLBACK_RESIDUAL: Residual = {
  gate: 1,
  readout: 1,
  idle: 1,
  variance_amplification: 1,
  strategy_confidence: 0.5,
};

// ------------------------------------------------------------------ error model

export interface ErrorBudget {
  gate: number;
  readout: number;
  idle: number;
  lambda: number;
  bias: number;
}

/** The three-channel error budget for a circuit on a backend, at a given calibration. */
export function errorBudget(
  profile: CircuitProfile,
  calibration: CalibrationSnapshot,
  residual: Residual = FALLBACK_RESIDUAL,
): ErrorBudget {
  const latest = calibration.history[calibration.history.length - 1];
  const p2 = latest?.two_qubit_error_rate.value ?? 0.01;
  const p1 = p2 / 10;
  const pro = latest?.readout_error_rate.value ?? 0.02;

  const gateBase = profile.two_qubit_gate_count * p2 + profile.single_qubit_gate_count * p1;
  const gate = gateBase * residual.gate;
  const readout = profile.measurement_count * pro * residual.readout;
  const idle = profile.idle_exposure.value * gateBase * 0.5 * residual.idle;
  const lambda = gate + readout + idle;
  return { gate, readout, idle, lambda, bias: 1 - Math.exp(-lambda) };
}

function perShotSeconds(profile: CircuitProfile): number {
  return RESET_READOUT_SECONDS + profile.depth * GATE_TIME_SECONDS;
}

// ------------------------------------------------------------------ generate

export interface GenerateResult {
  items: MitigationStrategy[];
  excluded: ExcludedStrategy[];
}

/** API_CONTRACT §5.6: incompatible techniques are SHOWN as excluded with their reason codes —
 *  never hidden, and never offered at zero benefit. */
export function generateStrategies(
  profile: CircuitProfile,
  backend: HardwareProfile,
): GenerateResult {
  const items: MitigationStrategy[] = [];
  const excluded: ExcludedStrategy[] = [];

  for (const s of STRATEGY_CATALOG) {
    const usesIdle = s.family === 'dd' || s.strategy_id === 'zne_dd_readout';
    if (usesIdle && profile.idle_exposure.value === 0) {
      excluded.push({
        strategy_id: s.strategy_id,
        display_name: s.display_name,
        reason_codes: ['UNSUPPORTED_CIRCUIT_FEATURE'],
        explanation:
          'This circuit has no idle exposure, so a decoupling sequence has no idle window to fill. Offering it would claim a benefit of exactly zero.',
      });
      continue;
    }
    if (usesIdle && !backend.supports_delay_scheduling) {
      excluded.push({
        strategy_id: s.strategy_id,
        display_name: s.display_name,
        reason_codes: ['UNSUPPORTED_CIRCUIT_FEATURE'],
        explanation: `${backend.display_name} does not declare delay scheduling, which a decoupling sequence needs in order to place its pulses.`,
      });
      continue;
    }
    if (s.family === 'zne' && profile.has_mid_circuit_measurement) {
      excluded.push({
        strategy_id: s.strategy_id,
        display_name: s.display_name,
        reason_codes: ['UNSUPPORTED_CIRCUIT_FEATURE'],
        explanation:
          'Gate folding is not defined across a mid-circuit measurement, so the noise-scaling assumption ZNE rests on does not hold here.',
      });
      continue;
    }
    if (s.family === 'qec_surface_code') {
      excluded.push({
        strategy_id: s.strategy_id,
        display_name: s.display_name,
        reason_codes: ['QEC_CAPABILITY_MISSING'],
        explanation: `${backend.display_name} declares no syndrome-extraction capability, so an encoded run cannot be scheduled on it. The QEC Lab models the code independently of any backend.`,
      });
      continue;
    }
    items.push(s);
  }
  return { items, excluded };
}

// ------------------------------------------------------------------ scoring

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Fixed, documented normalization ranges (RECON-20) — never per-batch min-max, so a plan's
 *  score does not move because a different plan joined the batch. Higher normalized = better. */
function normalize(term: 'error' | 'cost' | 'time', raw: number, goal: ReliabilityGoal): number {
  if (term === 'error') return clamp01(-Math.log10(Math.max(raw, 1e-12)) / 4);
  if (term === 'cost') return clamp01(1 - raw / goal.max_cost_usd);
  return clamp01(1 - raw / goal.max_runtime_seconds);
}

function buildScore(
  rmse: number,
  cost: number,
  seconds: number,
  goal: ReliabilityGoal,
  weights: Record<string, number>,
): ScoreBreakdown {
  const rows: { name: string; raw: number; unit: string; normalized: number; weight: number }[] = [
    {
      name: 'Residual error',
      raw: rmse,
      unit: 'expectation_value',
      normalized: normalize('error', rmse, goal),
      weight: weights.error ?? 0,
    },
    {
      name: 'Modelled cost',
      raw: cost,
      unit: 'usd',
      normalized: normalize('cost', cost, goal),
      weight: weights.cost ?? 0,
    },
    {
      name: 'QPU time',
      raw: seconds,
      unit: 'seconds',
      normalized: normalize('time', seconds, goal),
      weight: weights.time ?? 0,
    },
    {
      name: 'Qubit overhead',
      raw: 1,
      unit: 'ratio',
      normalized: 1,
      weight: weights.qubit_overhead ?? 0,
    },
    {
      name: 'Decoder latency',
      raw: 0,
      unit: 'ratio',
      normalized: 1,
      weight: weights.decoder_latency ?? 0,
    },
  ];

  const terms = rows.map((r) => ({
    name: r.name,
    raw: q(Number(r.raw.toPrecision(4)), r.unit, 'heuristic', METHOD_REF),
    normalized: Number(r.normalized.toFixed(4)),
    weight: r.weight,
    contribution: Number((r.normalized * r.weight).toFixed(4)),
  }));

  const value = Number(terms.reduce((sum, t) => sum + t.contribution, 0).toFixed(4));
  const driver = [...terms].sort((a, b) => b.contribution - a.contribution)[0];

  return {
    value,
    terms,
    normalization_ref: NORMALIZATION_REF,
    method_ref: METHOD_REF,
    explanation: `Weighted sum of ${terms.length} normalized terms on fixed ranges. The largest single contribution is ${driver?.name ?? 'none'} at ${driver?.contribution ?? 0}. Terms carrying weight 0 under this priority preset are listed so the vector is visible, not omitted.`,
  };
}

// ------------------------------------------------------------------ optimize

export interface PlanInputs {
  profile: CircuitProfile;
  backend: HardwareProfile;
  calibration: CalibrationSnapshot;
  strategy: MitigationStrategy;
  goal: ReliabilityGoal;
  shots?: number;
}

export function buildPlan(input: PlanInputs): ExecutionPlan {
  const { profile, backend, calibration, strategy, goal } = input;
  const shots = input.shots ?? DEFAULT_SHOTS;
  const residual = RESIDUALS[strategy.strategy_id] ?? FALLBACK_RESIDUAL;

  const budget = errorBudget(profile, calibration, residual);
  const sigma = Math.sqrt(residual.variance_amplification / shots);
  const rmse = Math.sqrt(budget.bias * budget.bias + sigma * sigma);

  const overhead = strategy.sampling_overhead.value;
  const seconds = shots * overhead * perShotSeconds(profile);
  const cost = seconds * backend.cost_per_qpu_second_usd.value;

  const findings: Finding[] = [];
  if (cost > goal.max_cost_usd) {
    findings.push({
      code: 'COST_EXCEEDED',
      severity: 'blocking',
      subject: 'plan',
      subject_id: strategy.strategy_id,
      message: `Modelled cost $${cost.toFixed(2)} exceeds the goal's maximum of $${goal.max_cost_usd.toFixed(2)}.`,
      evidence: { estimated_cost_usd: Number(cost.toFixed(2)), max_cost_usd: goal.max_cost_usd },
    });
  }
  if (seconds > goal.max_runtime_seconds) {
    findings.push({
      code: 'MITIGATION_OVERHEAD_TOO_HIGH',
      severity: 'blocking',
      subject: 'strategy',
      subject_id: strategy.strategy_id,
      message: `A sampling overhead of ${overhead}x puts QPU time at ${seconds.toFixed(0)} s, past the goal's ${goal.max_runtime_seconds} s ceiling.`,
      evidence: { estimated_qpu_seconds: Number(seconds.toFixed(1)), sampling_overhead: overhead },
    });
  }
  if (!strategy.executable) {
    findings.push({
      code: 'MITIGATION_OVERHEAD_TOO_HIGH',
      severity: 'blocking',
      subject: 'strategy',
      subject_id: strategy.strategy_id,
      message: `${strategy.display_name} is not executable in V1 — it is shown as an overhead calculation so its cost is visible, and it is never recommended.`,
      evidence: { sampling_overhead: overhead, executable: 'false' },
    });
  }
  if (rmse > goal.target_error) {
    findings.push({
      code: 'TARGET_ERROR_UNLIKELY',
      severity: 'warning',
      subject: 'goal',
      subject_id: null,
      message: `Modelled residual error ${rmse.toPrecision(3)} is above the goal's target of ${goal.target_error}.`,
      evidence: { rmse: Number(rmse.toPrecision(4)), target_error: goal.target_error },
    });
  }
  findings.push(...calibration.validity.drift_findings);

  const feasible = !findings.some((f) => f.severity === 'blocking');
  const weights = PRESET_WEIGHTS[goal.priority] ?? PRESET_WEIGHTS.balanced!;

  return {
    plan_id: `plan_${backend.backend_id}_${strategy.strategy_id}`,
    circuit_fingerprint: profile.circuit_fingerprint,
    backend_id: backend.backend_id,
    calibration_snapshot_id: calibration.calibration_snapshot_id,
    strategy,
    shots,
    rmse: q(Number(rmse.toPrecision(4)), 'expectation_value', 'heuristic', METHOD_REF),
    // Fraction of the goal's error budget the plan is modelled to leave intact: 1.0 when the
    // plan lands inside the target, decaying as it overshoots. This is what the Rail's trace
    // amplitude binds to (design_tokens.rail.trace.bind).
    reliability_estimate: Number(clamp01(goal.target_error / Math.max(rmse, goal.target_error)).toFixed(4)),
    estimated_cost_usd: q(Number(cost.toFixed(2)), 'usd', 'heuristic', METHOD_REF),
    estimated_qpu_seconds: q(Number(seconds.toFixed(1)), 'seconds', 'heuristic', METHOD_REF),
    statistical_confidence: goal.statistical_confidence,
    strategy_confidence: residual.strategy_confidence,
    feasibility: feasible ? 'feasible' : 'infeasible',
    // Invariant I-6: an infeasible plan has no score. Scoring it would invite ranking it.
    score: feasible ? buildScore(rmse, cost, seconds, goal, weights) : null,
    findings,
    tie_break_applied: false,
  };
}

/** Two-stage optimize (RECON-19): hard constraints first, scoring only over survivors. */
export function optimize(
  profile: CircuitProfile,
  backends: HardwareProfile[],
  calibrations: Record<string, CalibrationSnapshot>,
  goal: ReliabilityGoal,
  shots = DEFAULT_SHOTS,
): OptimizeResponse {
  const plans: ExecutionPlan[] = [];
  for (const backend of backends) {
    const calibration = calibrations[backend.backend_id];
    if (!calibration) continue;
    const { items } = generateStrategies(profile, backend);
    for (const strategy of items) {
      plans.push(buildPlan({ profile, backend, calibration, strategy, goal, shots }));
    }
  }

  const feasible = plans.filter((p) => p.feasibility === 'feasible' && p.score !== null);
  feasible.sort((a, b) => {
    const d = (b.score?.value ?? 0) - (a.score?.value ?? 0);
    if (Math.abs(d) > 1e-9) return d;
    return a.estimated_cost_usd.value - b.estimated_cost_usd.value; // deterministic tie-break
  });
  const best = feasible[0];
  const runnerUp = feasible[1];
  if (best && runnerUp && Math.abs((best.score?.value ?? 0) - (runnerUp.score?.value ?? 0)) < 1e-9) {
    best.tie_break_applied = true;
  }

  return {
    plans,
    // Never names an infeasible plan; null when everything is infeasible is a legitimate answer.
    recommended_plan_id: best?.plan_id ?? null,
    weights: PRESET_WEIGHTS[goal.priority] ?? PRESET_WEIGHTS.balanced!,
    normalization_ref: NORMALIZATION_REF,
    seed: 0,
  };
}

/** The Pareto-efficient subset: no other plan is cheaper AND at least as accurate.
 *  Computed over feasible plans only — dominating an infeasible plan means nothing. */
export function paretoFront(plans: ExecutionPlan[]): Set<string> {
  const feasible = plans.filter((p) => p.feasibility === 'feasible');
  const front = new Set<string>();
  for (const p of feasible) {
    const dominated = feasible.some(
      (o) =>
        o.plan_id !== p.plan_id &&
        o.estimated_cost_usd.value <= p.estimated_cost_usd.value &&
        o.rmse.value <= p.rmse.value &&
        (o.estimated_cost_usd.value < p.estimated_cost_usd.value || o.rmse.value < p.rmse.value),
    );
    if (!dominated) front.add(p.plan_id);
  }
  return front;
}

// ------------------------------------------------------------------ preflight

const NEXT_STEPS: Record<string, string> = {
  COST_EXCEEDED: 'Raise the cost ceiling in the goal, cut shots, or pick a lower-overhead strategy.',
  TARGET_ERROR_UNLIKELY:
    'Relax the target error, or accept that this is a QEC-scale requirement rather than a QEM one.',
  CALIBRATION_STALE: 'Refresh the calibration snapshot, or accept the risk explicitly.',
  MITIGATION_OVERHEAD_TOO_HIGH: 'Reduce the number of scale factors, or lower the shot count.',
  UNSUPPORTED_CIRCUIT_FEATURE: 'Choose a technique compatible with this circuit.',
  QEC_CAPABILITY_MISSING: 'No demo backend declares this capability; model it in the QEC Lab instead.',
  INSUFFICIENT_CALIBRATION_DATA: 'Collect a calibration snapshot for this backend.',
};

export function preflight(plan: ExecutionPlan, goal: ReliabilityGoal): PreflightVerdict {
  const findings = [...plan.findings];
  // API_CONTRACT §3: TARGET_ERROR_UNLIKELY escalates to blocking at >= 10x the target.
  for (const f of findings) {
    if (f.code === 'TARGET_ERROR_UNLIKELY' && plan.rmse.value >= goal.target_error * 10) {
      f.severity = 'blocking';
    }
  }
  const status = statusFromFindings(findings);
  const blocking = findings.filter((f) => f.severity === 'blocking');
  const warnings = findings.filter((f) => f.severity === 'warning');

  const summary =
    status === 'RUN'
      ? `${plan.strategy.display_name} on ${plan.backend_id} clears every hard constraint in the goal, with no warnings raised.`
      : status === 'RUN_WITH_WARNING'
        ? `${plan.strategy.display_name} clears every hard constraint, with ${warnings.length} warning${warnings.length === 1 ? '' : 's'} to acknowledge before running.`
        : status === 'DO_NOT_RUN'
          ? `${blocking.length} hard constraint${blocking.length === 1 ? '' : 's'} are violated, so this plan is not offered. Nothing has been executed and no cost has been incurred.`
          : 'A required input is missing, so no verdict can be given. Not knowing is reported as its own outcome rather than being rounded to a pass or a fail.';

  return { status, findings, summary, plan_id: plan.plan_id };
}

export function nextStepsFor(code: string): string {
  return NEXT_STEPS[code] ?? 'Review the finding and adjust the goal or the plan.';
}
