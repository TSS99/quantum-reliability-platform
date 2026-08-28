// Client-side OpenQASM parser (Tier 2: bring your own circuit).
//
// Why this exists in the browser: the public prototype is a STATIC site with no backend, so a
// server-only parser would leave the deployed app unable to accept a user's circuit at all. This
// mirrors `services/api/app/circuits/qasm.py`'s fallback scanner: same gate set, same limits, same
// reason codes. The backend's qiskit parser stays authoritative wherever a backend is reachable.
//
// It parses text — it never evaluates it. No `eval`, no `Function`, no dynamic import.

export const MAX_SOURCE_BYTES = 256 * 1024;
export const MAX_QUBITS = 64;
export const MAX_GATES = 20_000;

const ONE_Q = new Set(['u', 'u1', 'u2', 'u3', 'p', 'x', 'y', 'z', 'h', 's', 'sdg', 't', 'tdg', 'rx', 'ry', 'rz', 'sx', 'sxdg', 'id']);
const TWO_Q = new Set(['cx', 'cz', 'cy', 'ch', 'crz', 'cp', 'cu1', 'cu3', 'swap', 'rzz', 'rxx', 'ryy', 'ecr']);
const THREE_Q = new Set(['ccx', 'cswap']);
const IGNORE = new Set(['openqasm', 'include', 'qreg', 'creg', 'qubit', 'bit', 'gate', 'barrier', 'def']);

export type ParseCode =
  | 'EMPTY_SOURCE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_CIRCUIT_FEATURE';

export interface ParsedCircuit {
  qubit_count: number;
  clbit_count: number;
  depth: number;
  single_qubit_gate_count: number;
  two_qubit_gate_count: number;
  multi_qubit_gate_count: number;
  total_gate_count: number;
  measurement_count: number;
  two_qubit_ratio: number;
  idle_exposure: number;
  gate_histogram: Record<string, number>;
  has_classical_feedback: boolean;
  qasm_version: '2' | '3';
  warnings: string[];
}

export class QasmError extends Error {
  code: ParseCode;
  constructor(message: string, code: ParseCode) {
    super(message);
    this.code = code;
    this.name = 'QasmError';
  }
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

/** Parse OpenQASM 2/3 into the feature set the optimizer consumes. Throws QasmError on refusal. */
export function parseQasm(source: string): ParsedCircuit {
  if (!source || !source.trim()) throw new QasmError('Paste a circuit first.', 'EMPTY_SOURCE');
  const bytes = new TextEncoder().encode(source).length;
  if (bytes > MAX_SOURCE_BYTES) {
    throw new QasmError(
      `Circuit is ${(bytes / 1024).toFixed(0)} KB; the limit is ${MAX_SOURCE_BYTES / 1024} KB.`,
      'PAYLOAD_TOO_LARGE',
    );
  }

  const body = stripComments(source);
  const version: '2' | '3' = /OPENQASM\s+3/i.test(body) ? '3' : '2';

  // Registers: OpenQASM 2 `qreg q[n];` and OpenQASM 3 `qubit[n] q;`
  let qubits = 0;
  let clbits = 0;
  for (const m of body.matchAll(/\bqreg\s+\w+\s*\[\s*(\d+)\s*\]|\bqubit\s*\[\s*(\d+)\s*\]/gi)) {
    qubits += Number(m[1] ?? m[2] ?? 0);
  }
  for (const m of body.matchAll(/\bcreg\s+\w+\s*\[\s*(\d+)\s*\]|\bbit\s*\[\s*(\d+)\s*\]/gi)) {
    clbits += Number(m[1] ?? m[2] ?? 0);
  }
  if (qubits === 0) {
    throw new QasmError(
      'No qubit register found — expected `qreg q[2];` (QASM 2) or `qubit[2] q;` (QASM 3).',
      'UNSUPPORTED_CIRCUIT_FEATURE',
    );
  }
  if (qubits > MAX_QUBITS) {
    throw new QasmError(`${qubits} qubits exceeds the ${MAX_QUBITS}-qubit limit.`, 'UNSUPPORTED_CIRCUIT_FEATURE');
  }

  const hist: Record<string, number> = {};
  let one = 0, two = 0, multi = 0, meas = 0;
  const unknown = new Set<string>();

  for (const line of body.split(/[\n;]/)) {
    const m = /^\s*([a-zA-Z][a-zA-Z0-9_]*)/.exec(line);
    if (!m) continue;
    const t = m[1]!.toLowerCase();
    if (IGNORE.has(t) || t === 'if') continue;
    if (t === 'measure') {
      // `measure q -> c;` over a whole register counts once per qubit it covers
      const whole = /measure\s+\w+\s*->/.test(line);
      const n = whole ? qubits : 1;
      meas += n;
      hist[t] = (hist[t] ?? 0) + n;
    } else if (ONE_Q.has(t)) { one++; hist[t] = (hist[t] ?? 0) + 1; }
    else if (TWO_Q.has(t)) { two++; hist[t] = (hist[t] ?? 0) + 1; }
    else if (THREE_Q.has(t)) { multi++; hist[t] = (hist[t] ?? 0) + 1; }
    else unknown.add(t);
  }

  const total = one + two + multi;
  if (total > MAX_GATES) {
    throw new QasmError(`${total} gates exceeds the ${MAX_GATES}-gate limit.`, 'UNSUPPORTED_CIRCUIT_FEATURE');
  }
  if (total === 0) {
    throw new QasmError('No recognised gates found in this circuit.', 'UNSUPPORTED_CIRCUIT_FEATURE');
  }

  // Depth is a LOWER BOUND without a scheduler: ceil(gates / qubits). Labelled in the warnings.
  const depth = Math.max(1, Math.ceil(total / qubits));
  const busy = one + 2 * two + 3 * multi;
  const idle = Math.max(0, 1 - busy / Math.max(depth * qubits, 1));

  const warnings = ['Depth is approximated (no scheduler in the browser); install the backend for an exact profile.'];
  if (unknown.size) warnings.push(`Unrecognised statements ignored: ${[...unknown].slice(0, 6).join(', ')}`);

  return {
    qubit_count: qubits,
    clbit_count: clbits,
    depth,
    single_qubit_gate_count: one,
    two_qubit_gate_count: two,
    multi_qubit_gate_count: multi,
    total_gate_count: total,
    measurement_count: meas,
    two_qubit_ratio: Number((two / total).toFixed(4)),
    idle_exposure: Number(idle.toFixed(4)),
    gate_histogram: hist,
    has_classical_feedback: /^\s*if\s*\(/m.test(body),
    qasm_version: version,
    warnings,
  };
}

/** Starter circuits users can load and edit, rather than facing an empty box. */
export const QASM_TEMPLATES: { id: string; label: string; qasm: string }[] = [
  {
    id: 'bell',
    label: 'Bell pair',
    qasm: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;`,
  },
  {
    id: 'ghz5',
    label: 'GHZ (5 qubits)',
    qasm: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[5];\ncreg c[5];\nh q[0];\ncx q[0],q[1];\ncx q[1],q[2];\ncx q[2],q[3];\ncx q[3],q[4];\nmeasure q -> c;`,
  },
  {
    id: 'qaoa',
    label: 'QAOA layer (4 qubits)',
    qasm: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[4];\ncreg c[4];\nh q[0];\nh q[1];\nh q[2];\nh q[3];\ncx q[0],q[1];\nrz(0.8) q[1];\ncx q[0],q[1];\ncx q[1],q[2];\nrz(0.8) q[2];\ncx q[1],q[2];\ncx q[2],q[3];\nrz(0.8) q[3];\ncx q[2],q[3];\nrx(1.1) q[0];\nrx(1.1) q[1];\nrx(1.1) q[2];\nrx(1.1) q[3];\nmeasure q -> c;`,
  },
];

// ---------------------------------------------------------------- adapter

import type { CircuitProfile } from './contracts';
import { q } from './demoFixtures';
import { errorBudget } from './demoEngine';
import type { CalibrationSnapshot } from './contracts';

/** Deterministic fingerprint from the circuit's normalised shape (§31). */
function fingerprint(p: ParsedCircuit): string {
  const canon = [
    p.qubit_count, p.depth, p.single_qubit_gate_count, p.two_qubit_gate_count,
    p.multi_qubit_gate_count, p.measurement_count,
    ...Object.entries(p.gate_histogram).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`),
  ].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'cf_' + h.toString(16).padStart(8, '0');
}

/**
 * Convert a parsed circuit into the CircuitProfile the optimizer consumes, pricing its raw error
 * with the SAME error-budget model the built-in examples use — so a user circuit is judged on
 * identical terms, not a separate ad-hoc path.
 */
export function toCircuitProfile(p: ParsedCircuit, calibration: CalibrationSnapshot): CircuitProfile {
  const base: CircuitProfile = {
    circuit_fingerprint: fingerprint(p),
    qubit_count: p.qubit_count,
    depth: p.depth,
    two_qubit_gate_count: p.two_qubit_gate_count,
    single_qubit_gate_count: p.single_qubit_gate_count,
    measurement_count: p.measurement_count,
    idle_exposure: q(p.idle_exposure, 'ratio', 'heuristic'),
    has_mid_circuit_measurement: false,
    has_classical_feedback: p.has_classical_feedback,
    estimated_raw_error: q(0, 'expectation_value', 'heuristic'),
  };
  const budget = errorBudget(base, calibration);
  return { ...base, estimated_raw_error: q(Number(budget.bias.toFixed(4)), 'expectation_value', 'heuristic') };
}
