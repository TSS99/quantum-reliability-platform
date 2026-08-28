// PROVISIONAL local mirror of the API_CONTRACT wire shapes.
//
// API_CONTRACT §1 makes `packages/contracts/` (generated from the Pydantic schemas) the only
// legal import for these types. That package is not generated yet — it currently holds a README
// and nothing else — so this module stands in for it and MUST be deleted, not merged, the moment
// the generator lands. Everything here is deliberately snake_case and byte-compatible with the
// documented responses so the DemoReliabilityDataSource -> ApiReliabilityDataSource swap
// (RECON-2 / §49) stays a one-line change.

export type Provenance =
  | 'measured'
  | 'simulated'
  | 'heuristic'
  | 'demo_fixture'
  | 'planning_estimate';

export type ExecutionMode = 'demo_replay' | 'local_simulation' | 'hardware';

/** RECON-3: every physical or estimated number travels with its unit and its provenance.
 *  Probabilities and error rates are 0-1 on the wire; percent exists only in the formatter. */
export interface Quantity {
  value: number;
  unit: string;
  provenance: Provenance;
  method_ref: string;
}

export type ReasonCode =
  | 'COST_EXCEEDED'
  | 'TARGET_ERROR_UNLIKELY'
  | 'CALIBRATION_STALE'
  | 'MITIGATION_OVERHEAD_TOO_HIGH'
  | 'UNSUPPORTED_CIRCUIT_FEATURE'
  | 'QEC_CAPABILITY_MISSING'
  | 'INSUFFICIENT_CALIBRATION_DATA';

export type Severity = 'blocking' | 'warning' | 'insufficient_data';

export interface Finding {
  code: ReasonCode;
  severity: Severity;
  subject: 'circuit' | 'backend' | 'calibration' | 'strategy' | 'goal' | 'plan';
  subject_id: string | null;
  message: string;
  evidence: Record<string, string | number>;
}

export type PreflightStatus = 'RUN' | 'RUN_WITH_WARNING' | 'DO_NOT_RUN' | 'INSUFFICIENT_DATA';

/** API_CONTRACT §3: computed from the findings, never assigned. It lives here only because the
 *  demo provider has to produce verdicts client-side; it is the same precedence rule. */
export function statusFromFindings(findings: readonly Finding[]): PreflightStatus {
  if (findings.some((f) => f.severity === 'insufficient_data')) return 'INSUFFICIENT_DATA';
  if (findings.some((f) => f.severity === 'blocking')) return 'DO_NOT_RUN';
  if (findings.some((f) => f.severity === 'warning')) return 'RUN_WITH_WARNING';
  return 'RUN';
}

export interface PreflightVerdict {
  status: PreflightStatus;
  findings: Finding[];
  summary: string;
  plan_id: string;
}

// ---------------------------------------------------------------- workloads

export interface QuantumWorkload {
  workload_id: string;
  display_name: string;
  /** RECON-14: an example circuit is meaningless without the observable it is measured against. */
  observable: string;
  observable_description: string;
  family: 'entanglement' | 'variational' | 'combinatorial';
  qubit_count: number;
  description: string;
  /** Complete OpenQASM source. It is parsed to draw the diagram and to derive the gate counts
   *  in CIRCUIT_PROFILES, so the picture, the counts and the costing cannot disagree. */
  qasm: string;
}

export interface CircuitProfile {
  circuit_fingerprint: string;
  qubit_count: number;
  depth: number;
  two_qubit_gate_count: number;
  single_qubit_gate_count: number;
  measurement_count: number;
  idle_exposure: Quantity;
  has_mid_circuit_measurement: boolean;
  has_classical_feedback: boolean;
  /** Estimated raw error on the normalized observable, before any mitigation. */
  estimated_raw_error: Quantity;
}

// ---------------------------------------------------------------- hardware

export type AdapterStatus = 'demo_support' | 'adapter_planned' | 'integration_implemented';

export interface CouplingEdge {
  control: number;
  target: number;
  two_qubit_error_rate: Quantity;
}

export interface QubitNode {
  qubit: number;
  /** Layout coordinates in the device's own lattice units, not pixels. */
  lattice_x: number;
  lattice_y: number;
  readout_error_rate: Quantity;
  t1_us: Quantity | null;
  t2_us: Quantity | null;
}

export interface HardwareProfile {
  backend_id: string;
  display_name: string;
  provider_id: string;
  adapter_status: AdapterStatus;
  qubit_count: number;
  basis_gates: string[];
  topology_class: string;
  qubits: QubitNode[];
  coupling_map: CouplingEdge[];
  median_two_qubit_error_rate: Quantity;
  median_readout_error_rate: Quantity;
  /** null renders "Not provided" (§20) — never 0. */
  quantum_volume: number | null;
  supports_dynamic_circuits: boolean;
  supports_delay_scheduling: boolean;
  cost_per_qpu_second_usd: Quantity;
}

export type CalibrationValidityState = 'stable' | 'watch' | 'stale' | 'significant_drift';

export interface CalibrationPoint {
  timestamp_utc: string;
  two_qubit_error_rate: Quantity;
  readout_error_rate: Quantity;
  t1_us: Quantity;
  t2_us: Quantity;
}

export interface CalibrationSnapshot {
  calibration_snapshot_id: string;
  backend_id: string;
  timestamp_utc: string;
  age_hours: number;
  validity: {
    state: CalibrationValidityState;
    thresholds_ref: string;
    stale_after_hours: number;
    drift_findings: Finding[];
  };
  history: CalibrationPoint[];
}

// ---------------------------------------------------------------- goal + strategy

export type PriorityPreset = 'minimize_cost' | 'balanced' | 'maximize_accuracy' | 'custom';

/**
 * WHAT is being estimated. This is not cosmetic: it decides which error metric the target is
 * expressed in, and therefore which strategies can even be considered. An expectation-value
 * technique like ZNE has no meaning for a sampling task, so the two cannot share a scoring model.
 */
export type TaskType = 'observable' | 'sampling';

export interface TaskSpec {
  type: TaskType;
  /** The metric `target_error` is measured in. */
  metric: 'absolute_expectation_error' | 'total_variation_distance';
  /** Pauli string, one symbol per qubit. Null for sampling tasks. */
  observable: string | null;
}

export interface ReliabilityGoal {
  /** Absolute error on a normalized observable <O> in [-1, 1] (RECON-10). */
  target_error: number;
  /** What is being estimated. The optimizer refuses a task it has no model for. */
  task: TaskSpec;
  statistical_confidence: number;
  max_cost_usd: number;
  max_runtime_seconds: number;
  priority: PriorityPreset;
}

export type StrategyFamily =
  | 'none'
  | 'zne'
  | 'dd'
  | 'readout_mitigation'
  | 'pec'
  | 'qec_surface_code';

export type Maturity = 'implemented' | 'experimental' | 'planned';

export interface MitigationStrategy {
  strategy_id: string;
  display_name: string;
  family: StrategyFamily;
  maturity: Maturity;
  /** PEC is a calculator in V1, never a runnable strategy (RECON-13, invariant I-11). */
  executable: boolean;
  sampling_overhead: Quantity;
  twirling_enabled: boolean;
  parameters: Record<string, string | number | boolean>;
  description: string;
}

export interface ExcludedStrategy {
  strategy_id: string;
  display_name: string;
  reason_codes: ReasonCode[];
  explanation: string;
}

export interface ScoreTermWire {
  name: string;
  raw: Quantity;
  /** Fixed documented range, NEVER per-batch min-max (RECON-20). */
  normalized: number;
  weight: number;
  contribution: number;
}

export interface ScoreBreakdown {
  value: number;
  terms: ScoreTermWire[];
  normalization_ref: string;
  method_ref: string;
  explanation: string;
}

export interface ExecutionPlan {
  plan_id: string;
  circuit_fingerprint: string;
  backend_id: string;
  calibration_snapshot_id: string;
  strategy: MitigationStrategy;
  shots: number;
  rmse: Quantity;
  reliability_estimate: number;
  estimated_cost_usd: Quantity;
  estimated_qpu_seconds: Quantity;
  statistical_confidence: number;
  strategy_confidence: number;
  feasibility: 'feasible' | 'infeasible';
  /** null for infeasible plans (invariant I-6). */
  score: ScoreBreakdown | null;
  findings: Finding[];
  tie_break_applied: boolean;
}

export interface OptimizeResponse {
  plans: ExecutionPlan[];
  recommended_plan_id: string | null;
  weights: Record<string, number>;
  normalization_ref: string;
  seed: number;
  /**
   * Set when the optimizer declined to answer. Present rather than returning plans from a model
   * that does not apply — silently scoring a sampling task with an expectation-value model would
   * be worse than refusing, because the UI implies the distinction is enforced.
   */
  unsupported?: { code: string; message: string };
}

// ---------------------------------------------------------------- experiments

export interface ExperimentRunSummary {
  run_id: string;
  created_at_utc: string;
  backend_id: string;
  strategy_id: string;
  strategy_display_name: string;
  circuit_fingerprint: string;
  workload_display_name: string;
  execution_mode: ExecutionMode;
  processed_estimate: Quantity;
  raw_estimate: Quantity;
  goal_result: 'met' | 'missed' | 'not_evaluated';
  preflight_status: PreflightStatus;
  /** null whenever execution_mode == 'demo_replay' (RECON-8, invariant I-7). */
  actual_runtime_seconds: number | null;
  actual_cost_usd: number | null;
}

// ---------------------------------------------------------------- QEC fixtures

export type QecCode = 'repetition' | 'rotated_surface';
export type QecNoiseModel = 'code_capacity' | 'phenomenological' | 'circuit_level';

/** One row of demo-data/qec/threshold_grid.json, exactly as generated (schema qec-fixture/1). */
export interface ThresholdGridRow {
  code: QecCode;
  distance: number;
  rounds: number;
  noise_model: QecNoiseModel;
  p: number;
  shots: number;
  logical_errors: number;
  logical_error_rate: number;
  ler_ci_low: number;
  ler_ci_high: number;
  logical_error_rate_per_round: number;
  lerpr_ci_low: number;
  lerpr_ci_high: number;
  per_round_null_reason: string | null;
  detection_event_rate: number;
  decoder_id: string;
  decoder_status: 'REAL' | 'NOT_IMPLEMENTED';
  not_implemented_reason: string | null;
  decoder_seconds_per_shot: number;
  physical_qubits: number;
  insufficient_statistics: boolean;
  threshold_semantics: string;
  seed: number;
}

export interface ThresholdGridFile {
  schema_version: string;
  qrp_version: string;
  data_provenance: string;
  execution_mode: string;
  manifest_ref: string;
  rows: ThresholdGridRow[];
}
