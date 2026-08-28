import { useMemo } from 'react';
import { Card } from '../components/ui';
import { CircuitDiagram } from '../components/charts/CircuitDiagram';
import { WORKLOADS, CIRCUIT_PROFILES } from '../services/demoFixtures';
import { parseQasm } from '../services/qasm';

const FAMILY: Record<string, string> = {
  entanglement: 'Entanglement',
  variational: 'Variational',
  combinatorial: 'Combinatorial',
};

export function Workloads() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow uppercase text-series-mitigated">Workloads</p>
        <h2 className="font-display text-display-m font-normal">Example quantum workloads</h2>
        <p className="mt-1 text-body-s text-text-muted">Each ships with the observable it is measured against — an example circuit without one is meaningless.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {WORKLOADS.map((w) => (
          <WorkloadCard key={w.workload_id} workload={w} />
        ))}
      </div>
    </div>
  );
}

function WorkloadCard({ workload: w }: { workload: (typeof WORKLOADS)[number] }) {
  const p = CIRCUIT_PROFILES[w.workload_id]!;
  // Drawn from the same parser the optimizer uses, so the diagram cannot describe a different
  // circuit from the one being costed.
  const parsed = useMemo(() => {
    try {
      return parseQasm(w.qasm);
    } catch {
      return null;
    }
  }, [w.qasm]);

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-heading-m text-text-primary">{w.display_name}</h3>
        <span className="shrink-0 rounded-chip border border-border-hairline px-1.5 py-0.5 text-caption text-text-muted">{FAMILY[w.family] ?? w.family}</span>
      </div>
      <p className="text-body-s text-text-secondary">{w.description}</p>
      <div className="text-caption text-text-muted">
        observable ⟨{w.observable}⟩ — {w.observable_description}
      </div>
      <dl className="grid grid-cols-4 gap-2 border-t border-border-hairline pt-2 text-body-s">
        {[['qubits', p.qubit_count], ['depth', p.depth], ['2Q', p.two_qubit_gate_count], ['meas', p.measurement_count]].map(([k, v]) => (
          <div key={k as string}><dt className="text-caption text-text-muted">{k}</dt><dd className="metric text-text-primary">{v}</dd></div>
        ))}
      </dl>
      {parsed && (
        <div className="rounded-control border border-border-hairline bg-bg-base p-2">
          <CircuitDiagram
            ops={parsed.ops}
            qubitCount={parsed.qubit_count}
            truncated={parsed.ops_truncated}
            title={`${w.display_name}: ${parsed.qubit_count} qubits, ${parsed.total_gate_count} gates, ${parsed.two_qubit_gate_count} two-qubit.`}
          />
        </div>
      )}

      <details className="group">
        <summary className="cursor-pointer text-caption text-text-muted hover:text-text-secondary">
          OpenQASM source
        </summary>
        <pre className="mono mt-1.5 max-h-44 overflow-auto rounded-control border border-border-hairline bg-bg-base p-2 text-[11px] text-text-secondary">{w.qasm}</pre>
      </details>
    </Card>
  );
}
