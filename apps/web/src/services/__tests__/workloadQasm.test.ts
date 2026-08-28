import { describe, expect, it } from 'vitest';
import { WORKLOADS, CIRCUIT_PROFILES } from '../demoFixtures';
import { parseQasm } from '../qasm';

/**
 * The workloads used to carry an abbreviated pseudo-QASM excerpt alongside hand-written gate
 * counts, and the two disagreed — a Bell pair was described as having two single-qubit gates.
 * The counts feed the error model, so that was a wrong number, not a cosmetic one.
 *
 * Each workload now ships complete OpenQASM, and this locks the profile to it. `depth` is
 * deliberately NOT asserted: the browser parser has no scheduler and reports an explicit lower
 * bound, so the authored depth is the better figure and is allowed to differ.
 */
describe('workload QASM matches its circuit profile', () => {
  for (const w of WORKLOADS) {
    it(w.workload_id, () => {
      const profile = CIRCUIT_PROFILES[w.workload_id];
      expect(profile, `no profile for ${w.workload_id}`).toBeDefined();

      const parsed = parseQasm(w.qasm);
      expect(parsed.qubit_count).toBe(profile!.qubit_count);
      expect(parsed.single_qubit_gate_count).toBe(profile!.single_qubit_gate_count);
      expect(parsed.two_qubit_gate_count).toBe(profile!.two_qubit_gate_count);
      expect(parsed.measurement_count).toBe(profile!.measurement_count);
      expect(parsed.qubit_count).toBe(w.qubit_count);
    });

    it(`${w.workload_id} yields drawable ops on every wire`, () => {
      const parsed = parseQasm(w.qasm);
      expect(parsed.ops.length).toBeGreaterThan(0);
      // Every op must land on a real wire, or the diagram would draw off the edge.
      for (const op of parsed.ops) {
        expect(op.qubits.length).toBeGreaterThan(0);
        for (const q of op.qubits) {
          expect(q).toBeGreaterThanOrEqual(0);
          expect(q).toBeLessThan(parsed.qubit_count);
        }
      }
      // A whole-register `measure q -> c;` must expand to one op per wire.
      const measured = new Set(parsed.ops.filter((o) => o.kind === 'measure').flatMap((o) => o.qubits));
      expect(measured.size).toBe(parsed.qubit_count);
    });
  }
});
