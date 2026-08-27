// Seeded, deterministic ILLUSTRATIVE fixtures for the demo provider.
//
// Every number produced here carries `provenance: 'demo_fixture'` or `'heuristic'` and is a
// modelled illustration, not a measurement (MISSION §34/§71). The backends are SYNTHETIC
// lattices with invented names — no real device is described, imitated or implied.
//
// Determinism (RECON-7): all randomness comes from `mulberry32` seeded from a constant, so the
// same build always renders the same figures and a screenshot is reproducible.

import type {
  CalibrationPoint,
  CalibrationSnapshot,
  CircuitProfile,
  CouplingEdge,
  HardwareProfile,
  MitigationStrategy,
  QuantumWorkload,
  QubitNode,
  Quantity,
} from './contracts';

export const DEMO_SEED = 20260827;
const METHOD_REF = 'docs/DEMO_VS_REAL.md#seeded-demo-fixtures';

/** Small, fast, fully deterministic PRNG. Same seed, same stream, forever. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function q(
  value: number,
  unit: string,
  provenance: Quantity['provenance'] = 'demo_fixture',
  method_ref: string = METHOD_REF,
): Quantity {
  return { value, unit, provenance, method_ref };
}

// ------------------------------------------------------------------ workloads

/** RECON-14: each example circuit ships WITH the observable it is measured against. */
export const WORKLOADS: QuantumWorkload[] = [
  {
    workload_id: 'bell_pair',
    display_name: 'Bell pair',
    observable: 'ZZ',
    observable_description:
      'Two-qubit parity <Z0 Z1>. Ideal value +1; any deviation is entirely error.',
    family: 'entanglement',
    qubit_count: 2,
    description:
      'The smallest circuit with entanglement. Used as the control: its ideal expectation value is known exactly, so measured deviation is attributable to noise rather than to approximation.',
    qasm_excerpt: 'h q[0];\ncx q[0], q[1];\nmeasure q -> c;',
  },
  {
    workload_id: 'ghz_8',
    display_name: 'GHZ-8',
    observable: 'Z^8 parity',
    observable_description:
      'Global parity <Z0 Z1 ... Z7> of the 8-qubit GHZ state. Ideal value +1.',
    family: 'entanglement',
    qubit_count: 8,
    description:
      'A linear GHZ ladder. Its depth grows with width, so it exposes idle time on the qubits prepared first — the regime where dynamical decoupling has something to do.',
    qasm_excerpt: 'h q[0];\nfor i in [0:6] { cx q[i], q[i+1]; }\nmeasure q -> c;',
  },
  {
    workload_id: 'vqe_h2_ansatz',
    display_name: 'VQE-like ansatz (4 qubits)',
    observable: 'H_mol expectation',
    observable_description:
      'Weighted sum of 15 Pauli terms standing in for a small molecular Hamiltonian, normalized to [-1, 1].',
    family: 'variational',
    qubit_count: 4,
    description:
      'A hardware-efficient ansatz with three repetition layers. Representative of the depth-versus-expressivity trade-off that makes error mitigation worth costing out.',
    qasm_excerpt: 'ry(theta[0]) q[0];\n... 3 x [ry layer; cx ring];\nmeasure q -> c;',
  },
  {
    workload_id: 'qaoa_maxcut_6',
    display_name: 'QAOA-like MaxCut (6 qubits)',
    observable: 'Cut Hamiltonian',
    observable_description:
      'Expected cut value on a 6-node ring graph, normalized to [-1, 1] by the maximum cut.',
    family: 'combinatorial',
    qubit_count: 6,
    description:
      'Two QAOA layers over a ring graph. The heaviest two-qubit gate count in the demo library, so it is where the sampling overhead of mitigation bites hardest.',
    qasm_excerpt: 'h q;\n2 x [zz-phase over ring edges; rx(beta) q];\nmeasure q -> c;',
  },
];

/** Structural metrics — these are properties of the circuit itself, so they are stated, not
 *  sampled. `estimated_raw_error` is explicitly heuristic: it is a depth-and-gate-count model
 *  at a nominal 1e-2 two-qubit error rate, re-derived per backend by the demo engine. */
export const CIRCUIT_PROFILES: Record<string, CircuitProfile> = {
  bell_pair: {
    circuit_fingerprint: 'cf_9a1c0f42',
    qubit_count: 2,
    depth: 3,
    two_qubit_gate_count: 1,
    single_qubit_gate_count: 2,
    measurement_count: 2,
    idle_exposure: q(0, 'ratio'),
    has_mid_circuit_measurement: false,
    has_classical_feedback: false,
    estimated_raw_error: q(0.021, 'expectation_value', 'heuristic'),
  },
  ghz_8: {
    circuit_fingerprint: 'cf_4d77be10',
    qubit_count: 8,
    depth: 9,
    two_qubit_gate_count: 7,
    single_qubit_gate_count: 9,
    measurement_count: 8,
    idle_exposure: q(0.31, 'ratio'),
    has_mid_circuit_measurement: false,
    has_classical_feedback: false,
    estimated_raw_error: q(0.094, 'expectation_value', 'heuristic'),
  },
  vqe_h2_ansatz: {
    circuit_fingerprint: 'cf_b208e5c7',
    qubit_count: 4,
    depth: 26,
    two_qubit_gate_count: 18,
    single_qubit_gate_count: 44,
    measurement_count: 4,
    idle_exposure: q(0.22, 'ratio'),
    has_mid_circuit_measurement: false,
    has_classical_feedback: false,
    estimated_raw_error: q(0.147, 'expectation_value', 'heuristic'),
  },
  qaoa_maxcut_6: {
    circuit_fingerprint: 'cf_71f3a9d5',
    qubit_count: 6,
    depth: 34,
    two_qubit_gate_count: 24,
    single_qubit_gate_count: 42,
    measurement_count: 6,
    idle_exposure: q(0.18, 'ratio'),
    has_mid_circuit_measurement: false,
    has_classical_feedback: false,
    estimated_raw_error: q(0.183, 'expectation_value', 'heuristic'),
  },
};

// ------------------------------------------------------------------ topologies

interface LatticeSpec {
  rows: number;
  cols: number;
  /** 'brick' inserts a vertical rung only on a staggered subset of columns, which is what gives
   *  a heavy-hex-like degree-3 lattice; 'grid' rungs every column; 'ring' closes a single row. */
  kind: 'brick' | 'grid' | 'ring';
}

function buildLattice(spec: LatticeSpec): { coords: [number, number][]; pairs: [number, number][] } {
  const { rows, cols, kind } = spec;
  const coords: [number, number][] = [];
  const pairs: [number, number][] = [];
  const id = (r: number, c: number) => r * cols + c;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) coords.push([c, r]);
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) pairs.push([id(r, c), id(r, c + 1)]);
  }
  if (kind === 'ring' && cols > 2) pairs.push([id(0, cols - 1), id(0, 0)]);
  if (kind === 'grid') {
    for (let r = 0; r < rows - 1; r += 1) {
      for (let c = 0; c < cols; c += 1) pairs.push([id(r, c), id(r + 1, c)]);
    }
  }
  if (kind === 'brick') {
    for (let r = 0; r < rows - 1; r += 1) {
      const offset = r % 2 === 0 ? 0 : 2;
      for (let c = offset; c < cols; c += 4) pairs.push([id(r, c), id(r + 1, c)]);
    }
  }
  return { coords, pairs };
}

interface BackendSpec {
  backend_id: string;
  display_name: string;
  topology_class: string;
  lattice: LatticeSpec;
  /** Centre of the seeded per-edge / per-qubit error distributions. */
  median_2q: number;
  median_readout: number;
  t1_center_us: number;
  t2_center_us: number;
  cost_per_qpu_second_usd: number;
  quantum_volume: number | null;
  supports_dynamic_circuits: boolean;
  supports_delay_scheduling: boolean;
  seed_offset: number;
}

const BACKEND_SPECS: BackendSpec[] = [
  {
    backend_id: 'demo_hexlat_27',
    display_name: 'Demo Hex-Lattice 27',
    topology_class: 'heavy-hex-like (synthetic)',
    lattice: { rows: 3, cols: 9, kind: 'brick' },
    median_2q: 0.0082,
    median_readout: 0.021,
    t1_center_us: 148,
    t2_center_us: 121,
    cost_per_qpu_second_usd: 1.6,
    quantum_volume: 128,
    supports_dynamic_circuits: true,
    supports_delay_scheduling: true,
    seed_offset: 11,
  },
  {
    backend_id: 'demo_grid_16',
    display_name: 'Demo Square-Grid 16',
    topology_class: 'square grid (synthetic)',
    lattice: { rows: 4, cols: 4, kind: 'grid' },
    median_2q: 0.0134,
    median_readout: 0.03,
    t1_center_us: 92,
    t2_center_us: 64,
    cost_per_qpu_second_usd: 0.9,
    quantum_volume: null,
    supports_dynamic_circuits: false,
    supports_delay_scheduling: true,
    seed_offset: 23,
  },
  {
    backend_id: 'demo_ring_12',
    display_name: 'Demo Ring 12',
    topology_class: 'closed ring (synthetic)',
    lattice: { rows: 1, cols: 12, kind: 'ring' },
    median_2q: 0.0057,
    median_readout: 0.016,
    t1_center_us: 203,
    t2_center_us: 176,
    cost_per_qpu_second_usd: 2.4,
    quantum_volume: 64,
    supports_dynamic_circuits: false,
    supports_delay_scheduling: false,
    seed_offset: 37,
  },
];

/** Log-normal-ish spread around a centre: error rates are positive and right-skewed, and a
 *  symmetric jitter would put some of them below zero. */
function spread(rand: () => number, centre: number, sigma: number): number {
  const u = rand() * 2 - 1;
  return Number((centre * Math.exp(u * sigma)).toPrecision(3));
}

function buildBackend(spec: BackendSpec): HardwareProfile {
  const rand = mulberry32(DEMO_SEED + spec.seed_offset);
  const { coords, pairs } = buildLattice(spec.lattice);

  const qubits: QubitNode[] = coords.map(([x, y], i) => ({
    qubit: i,
    lattice_x: x,
    lattice_y: y,
    readout_error_rate: q(spread(rand, spec.median_readout, 0.45), 'probability'),
    t1_us: q(spread(rand, spec.t1_center_us, 0.28), 'microseconds'),
    t2_us: q(spread(rand, spec.t2_center_us, 0.32), 'microseconds'),
  }));

  const coupling_map: CouplingEdge[] = pairs.map(([a, b]) => ({
    control: a,
    target: b,
    two_qubit_error_rate: q(spread(rand, spec.median_2q, 0.55), 'probability'),
  }));

  return {
    backend_id: spec.backend_id,
    display_name: spec.display_name,
    provider_id: 'demo_provider',
    adapter_status: 'demo_support',
    qubit_count: qubits.length,
    basis_gates: ['rz', 'sx', 'x', 'cx', 'measure'],
    topology_class: spec.topology_class,
    qubits,
    coupling_map,
    median_two_qubit_error_rate: q(spec.median_2q, 'probability'),
    median_readout_error_rate: q(spec.median_readout, 'probability'),
    quantum_volume: spec.quantum_volume,
    supports_dynamic_circuits: spec.supports_dynamic_circuits,
    supports_delay_scheduling: spec.supports_delay_scheduling,
    cost_per_qpu_second_usd: q(spec.cost_per_qpu_second_usd, 'usd'),
  };
}

export const BACKENDS: HardwareProfile[] = BACKEND_SPECS.map(buildBackend);

// ------------------------------------------------------------------ calibration

/** Fixed clock so the demo is reproducible: a "now" that moves would make every screenshot
 *  differ and would quietly change the staleness verdicts below. */
export const DEMO_NOW_UTC = '2026-08-27T09:00:00Z';
const DEMO_NOW_MS = Date.parse(DEMO_NOW_UTC);
const HOUR_MS = 3_600_000;

interface DriftSpec {
  age_hours: number;
  state: CalibrationSnapshot['validity']['state'];
  /** Multiplicative drift applied across the 14-point history, oldest to newest. */
  drift_factor: number;
}

const DRIFT: Record<string, DriftSpec> = {
  demo_hexlat_27: { age_hours: 3.2, state: 'stable', drift_factor: 1.06 },
  demo_grid_16: { age_hours: 14.5, state: 'watch', drift_factor: 1.34 },
  demo_ring_12: { age_hours: 41.7, state: 'stale', drift_factor: 1.81 },
};

const STALE_AFTER_HOURS = 24;
const THRESHOLDS_REF = '/settings';

function buildCalibration(backend: HardwareProfile): CalibrationSnapshot {
  const spec = DRIFT[backend.backend_id] ?? { age_hours: 6, state: 'stable', drift_factor: 1.05 };
  const rand = mulberry32(DEMO_SEED + backend.qubit_count * 7);
  const t1c = BACKEND_SPECS.find((s) => s.backend_id === backend.backend_id)?.t1_center_us;
  const t2c = BACKEND_SPECS.find((s) => s.backend_id === backend.backend_id)?.t2_center_us;
  const points = 14;
  const history: CalibrationPoint[] = [];

  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1); // 0 = oldest, 1 = newest
    const growth = 1 + (spec.drift_factor - 1) * t;
    const ts = DEMO_NOW_MS - (spec.age_hours + (points - 1 - i) * 12) * HOUR_MS;
    history.push({
      timestamp_utc: new Date(ts).toISOString().replace('.000', ''),
      two_qubit_error_rate: q(
        Number((backend.median_two_qubit_error_rate.value * growth * (0.94 + rand() * 0.12)).toPrecision(3)),
        'probability',
      ),
      readout_error_rate: q(
        Number((backend.median_readout_error_rate.value * growth * (0.95 + rand() * 0.1)).toPrecision(3)),
        'probability',
      ),
      t1_us: q(Number((((t1c ?? 120) / growth) * (0.95 + rand() * 0.1)).toPrecision(3)), 'microseconds'),
      t2_us: q(Number((((t2c ?? 96) / growth) * (0.95 + rand() * 0.1)).toPrecision(3)), 'microseconds'),
    });
  }

  const stale = spec.age_hours > STALE_AFTER_HOURS;
  return {
    calibration_snapshot_id: `cal_${backend.backend_id}_20260827`,
    backend_id: backend.backend_id,
    timestamp_utc: new Date(DEMO_NOW_MS - spec.age_hours * HOUR_MS).toISOString().replace('.000', ''),
    age_hours: spec.age_hours,
    validity: {
      state: spec.state,
      thresholds_ref: THRESHOLDS_REF,
      stale_after_hours: STALE_AFTER_HOURS,
      drift_findings: stale
        ? [
            {
              code: 'CALIBRATION_STALE',
              severity: 'warning',
              subject: 'calibration',
              subject_id: `cal_${backend.backend_id}_20260827`,
              message: `The calibration snapshot is ${spec.age_hours.toFixed(1)} h old; the configured staleness threshold is ${STALE_AFTER_HOURS} h.`,
              evidence: { age_hours: spec.age_hours, stale_after_hours: STALE_AFTER_HOURS },
            },
          ]
        : [],
    },
    history,
  };
}

export const CALIBRATIONS: Record<string, CalibrationSnapshot> = Object.fromEntries(
  BACKENDS.map((b) => [b.backend_id, buildCalibration(b)]),
);

// ------------------------------------------------------------------ strategies

/** The catalog. Which entries are OFFERED for a given circuit + backend is decided by the demo
 *  engine from the compatibility rules in API_CONTRACT §5.6 — not by editing this list. */
export const STRATEGY_CATALOG: MitigationStrategy[] = [
  {
    strategy_id: 'none',
    display_name: 'No mitigation (baseline)',
    family: 'none',
    maturity: 'implemented',
    executable: true,
    sampling_overhead: q(1, 'ratio', 'heuristic'),
    twirling_enabled: false,
    parameters: {},
    description:
      'The control arm. Every mitigated estimate is reported as a delta against this, so the benefit claim always has a denominator.',
  },
  {
    strategy_id: 'readout_tensored',
    display_name: 'Readout mitigation (tensored)',
    family: 'readout_mitigation',
    maturity: 'implemented',
    executable: true,
    sampling_overhead: q(1.15, 'ratio', 'heuristic'),
    twirling_enabled: false,
    parameters: { calibration_shots: 2048, model: 'tensored' },
    description:
      'Inverts a per-qubit assignment matrix measured from calibration circuits. Cheap, and it only addresses measurement error — it does nothing for gate error.',
  },
  {
    strategy_id: 'dd_xy4',
    display_name: 'Dynamical decoupling (XY4)',
    family: 'dd',
    maturity: 'implemented',
    executable: true,
    sampling_overhead: q(1, 'ratio', 'heuristic'),
    twirling_enabled: false,
    parameters: { sequence: 'XY4', insert_on_idle: true },
    description:
      'Fills idle windows with a refocusing pulse sequence. Free in shots, but it has nothing to act on when the circuit has no idle exposure.',
  },
  {
    strategy_id: 'zne_richardson_3',
    display_name: 'ZNE — Richardson, 3 scale factors',
    family: 'zne',
    maturity: 'implemented',
    executable: true,
    sampling_overhead: q(3, 'ratio', 'heuristic'),
    twirling_enabled: true,
    parameters: { scale_factors: '1, 3, 5', folding: 'gate', extrapolation: 'richardson' },
    description:
      'Runs the circuit at amplified noise and extrapolates back to zero. Costs one full circuit execution per scale factor and assumes the noise scales the way the folding says it does.',
  },
  {
    strategy_id: 'zne_exponential_5',
    display_name: 'ZNE — exponential, 5 scale factors',
    family: 'zne',
    maturity: 'experimental',
    executable: true,
    sampling_overhead: q(5, 'ratio', 'heuristic'),
    twirling_enabled: true,
    parameters: { scale_factors: '1, 2, 3, 4, 5', folding: 'gate', extrapolation: 'exponential' },
    description:
      'More scale factors and a decaying-exponential fit. Marked experimental: the fit is less stable than Richardson when the sampled points are noisy.',
  },
  {
    strategy_id: 'zne_dd_readout',
    display_name: 'ZNE(3) + DD(XY4) + readout',
    family: 'zne',
    maturity: 'implemented',
    executable: true,
    sampling_overhead: q(3.45, 'ratio', 'heuristic'),
    twirling_enabled: true,
    parameters: { scale_factors: '1, 3, 5', dd_sequence: 'XY4', readout_model: 'tensored' },
    description:
      'The stacked configuration. The three techniques address different error channels, so their benefits partially compose — they do not simply add.',
  },
  {
    strategy_id: 'pec_full',
    display_name: 'PEC (overhead calculator)',
    family: 'pec',
    maturity: 'planned',
    executable: false,
    sampling_overhead: q(118, 'ratio', 'heuristic'),
    twirling_enabled: true,
    parameters: { requires: 'full gate-set tomography' },
    description:
      'Probabilistic error cancellation is unbiased in principle and prohibitively expensive in practice. V1 ships it as an overhead calculator only — it is never offered as a runnable plan (RECON-13).',
  },
  {
    strategy_id: 'qec_surface_d3',
    display_name: 'Surface code, d = 3',
    family: 'qec_surface_code',
    maturity: 'planned',
    executable: false,
    sampling_overhead: q(1, 'ratio', 'heuristic'),
    twirling_enabled: false,
    parameters: { code: 'rotated_surface', distance: 3, physical_qubits_per_logical: 17 },
    description:
      'Fully fault-tolerant encoding. Listed so the QEM-to-QEC continuum is visible, and excluded on every demo backend because none of them declares the syndrome-extraction capability it needs.',
  },
];
