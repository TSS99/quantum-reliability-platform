import { Card } from '../components/ui';
import { WORKLOADS, CIRCUIT_PROFILES } from '../services/demoFixtures';

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
        <h2 className="text-display-m">Example quantum workloads</h2>
        <p className="mt-1 text-body-s text-text-muted">Each ships with the observable it is measured against — an example circuit without one is meaningless.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {WORKLOADS.map((w) => {
          const p = CIRCUIT_PROFILES[w.workload_id]!;
          return (
            <Card key={w.workload_id} className="flex flex-col gap-2 p-4">
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
              <pre className="mono max-h-28 overflow-auto rounded-control border border-border-hairline bg-bg-base p-2 text-[11px] text-text-secondary">{w.qasm_excerpt}</pre>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
