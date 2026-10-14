// GENERATED FILE — do not edit by hand.
// Run `python scripts/generate_contracts.py` from the repo root to regenerate.
// Source of truth: services/api Pydantic models, via openapi.json.
import { z } from 'zod';


export interface CandidateIn {
  candidate_id: string;
  backend_id: string;
  strategy_id: string;
  estimated_cost_usd: number;
  rmse: number;
  estimated_qpu_seconds: number;
  qubit_overhead?: number;
  decoder_latency_s?: number;
}

export const CandidateInSchema = z.object({
  candidate_id: z.string(),
  backend_id: z.string(),
  strategy_id: z.string(),
  estimated_cost_usd: z.number(),
  rmse: z.number(),
  estimated_qpu_seconds: z.number(),
  qubit_overhead: z.number().optional(),
  decoder_latency_s: z.number().optional(),
});
export type CandidateInZod = z.infer<typeof CandidateInSchema>;

export interface CircuitAnalyzeRequest {
  qubit_count: number;
  depth: number;
  two_qubit_gate_count: number;
  single_qubit_gate_count: number;
  measurement_count: number;
  has_mid_circuit_measurement?: boolean;
  has_classical_feedback?: boolean;
}

export const CircuitAnalyzeRequestSchema = z.object({
  qubit_count: z.number().int(),
  depth: z.number().int(),
  two_qubit_gate_count: z.number().int(),
  single_qubit_gate_count: z.number().int(),
  measurement_count: z.number().int(),
  has_mid_circuit_measurement: z.boolean().optional(),
  has_classical_feedback: z.boolean().optional(),
});
export type CircuitAnalyzeRequestZod = z.infer<typeof CircuitAnalyzeRequestSchema>;

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export const ValidationErrorSchema = z.object({
  loc: z.array(z.union([z.string(), z.number().int()])),
  msg: z.string(),
  type: z.string(),
  input: z.unknown().optional(),
  ctx: z.record(z.unknown()).optional(),
});
export type ValidationErrorZod = z.infer<typeof ValidationErrorSchema>;

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export const HTTPValidationErrorSchema = z.object({
  detail: z.array(ValidationErrorSchema).optional(),
});
export type HTTPValidationErrorZod = z.infer<typeof HTTPValidationErrorSchema>;

export interface Quantity {
  value: number;
  unit: 'probability' | 'expectation_value' | 'ratio' | 'usd' | 'seconds' | 'microseconds' | 'count';
  provenance: 'measured' | 'simulated' | 'heuristic' | 'demo_fixture' | 'planning_estimate';
  method_ref: string;
}

export const QuantitySchema = z.object({
  value: z.number(),
  unit: z.enum(['probability', 'expectation_value', 'ratio', 'usd', 'seconds', 'microseconds', 'count']),
  provenance: z.enum(['measured', 'simulated', 'heuristic', 'demo_fixture', 'planning_estimate']),
  method_ref: z.string(),
}).strict();
export type QuantityZod = z.infer<typeof QuantitySchema>;

export interface ScoreWeights {
  w_error: number;
  w_cost: number;
  w_time: number;
  w_qubit_overhead: number;
  w_decoder_latency: number;
}

export const ScoreWeightsSchema = z.object({
  w_error: z.number(),
  w_cost: z.number(),
  w_time: z.number(),
  w_qubit_overhead: z.number(),
  w_decoder_latency: z.number(),
}).strict();
export type ScoreWeightsZod = z.infer<typeof ScoreWeightsSchema>;

export interface TaskSpec {
  type: 'observable' | 'sampling';
  metric: 'absolute_expectation_error' | 'total_variation_distance';
  observable?: string | null;
}

export const TaskSpecSchema = z.object({
  type: z.enum(['observable', 'sampling']),
  metric: z.enum(['absolute_expectation_error', 'total_variation_distance']),
  observable: z.string().nullable().optional(),
}).strict();
export type TaskSpecZod = z.infer<typeof TaskSpecSchema>;

export interface ReliabilityGoal {
  target_error: Quantity;
  task: TaskSpec;
  confidence_target: number;
  max_cost_usd: Quantity;
  max_runtime_seconds: Quantity;
  priority: 'minimize_cost' | 'balanced' | 'maximize_accuracy' | 'custom';
  weights?: ScoreWeights | null;
}

export const ReliabilityGoalSchema = z.object({
  target_error: QuantitySchema,
  task: TaskSpecSchema,
  confidence_target: z.number(),
  max_cost_usd: QuantitySchema,
  max_runtime_seconds: QuantitySchema,
  priority: z.enum(['minimize_cost', 'balanced', 'maximize_accuracy', 'custom']),
  weights: ScoreWeightsSchema.nullable().optional(),
}).strict();
export type ReliabilityGoalZod = z.infer<typeof ReliabilityGoalSchema>;

export interface OptimizeRequest {
  goal: ReliabilityGoal;
  candidates: CandidateIn[];
}

export const OptimizeRequestSchema = z.object({
  goal: ReliabilityGoalSchema,
  candidates: z.array(CandidateInSchema),
});
export type OptimizeRequestZod = z.infer<typeof OptimizeRequestSchema>;

export interface QasmRequest {
  qasm: string;
}

export const QasmRequestSchema = z.object({
  qasm: z.string(),
});
export type QasmRequestZod = z.infer<typeof QasmRequestSchema>;

export interface QecSimulateRequest {
  code: 'repetition' | 'rotated_surface';
  distance: number;
  noise_model: 'code_capacity' | 'phenomenological' | 'circuit_level';
  p: number;
  decoder_id?: string;
  rounds?: number | null;
  max_shots?: number;
  max_errors?: number;
  seed?: number;
}

export const QecSimulateRequestSchema = z.object({
  code: z.enum(['repetition', 'rotated_surface']),
  distance: z.number().int(),
  noise_model: z.enum(['code_capacity', 'phenomenological', 'circuit_level']),
  p: z.number(),
  decoder_id: z.string().optional(),
  rounds: z.number().int().nullable().optional(),
  max_shots: z.number().int().optional(),
  max_errors: z.number().int().optional(),
  seed: z.number().int().optional(),
});
export type QecSimulateRequestZod = z.infer<typeof QecSimulateRequestSchema>;

export interface SubmitJobRequest {
  qasm: string;
  backend_id: string;
  shots?: number;
}

export const SubmitJobRequestSchema = z.object({
  qasm: z.string(),
  backend_id: z.string(),
  shots: z.number().int().optional(),
});
export type SubmitJobRequestZod = z.infer<typeof SubmitJobRequestSchema>;
