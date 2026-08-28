import { Card } from '../components/ui';

type Status = 'demo_support' | 'adapter_planned' | 'integration_implemented';

const STATUS: Record<Status, { label: string; cls: string }> = {
  demo_support: { label: 'Demo support', cls: 'text-state-healthy bg-state-healthy-bg' },
  adapter_planned: { label: 'Adapter planned', cls: 'text-state-uncertain bg-state-uncertain-bg' },
  integration_implemented: { label: 'Integration live', cls: 'text-series-mitigated bg-state-healthy-bg' },
};

// Honest capability table: what the platform supports TODAY vs what is planned. No partnership
// claims — provider names denote planned compatibility only (MISSION §15 platform-neutral layer).
const ROWS: { provider: string; kind: string; status: Status; note: string }[] = [
  { provider: 'Demo provider', kind: 'Superconducting + ion-trap', status: 'demo_support', note: 'Seeded profiles + calibration powering this prototype.' },
  { provider: 'IBM-like', kind: 'Superconducting', status: 'adapter_planned', note: 'Adapter interface defined; real tokens live server-side only.' },
  { provider: 'IQM-like', kind: 'Superconducting', status: 'adapter_planned', note: 'Planned.' },
  { provider: 'Rigetti-like', kind: 'Superconducting', status: 'adapter_planned', note: 'Planned.' },
  { provider: 'IonQ-like', kind: 'Ion trap', status: 'adapter_planned', note: 'Planned.' },
  { provider: 'Quantinuum-like', kind: 'Ion trap', status: 'adapter_planned', note: 'Planned.' },
];

export function Integrations() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow uppercase text-series-mitigated">Integrations</p>
        <h2 className="font-display text-display-m font-normal">Provider support</h2>
        <p className="mt-1 max-w-2xl text-body-s text-text-muted">
          A hardware-independent control plane. The prototype runs on the demo provider; real
          adapters are backend-only by design — no provider credential ever reaches the browser.
        </p>
      </header>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-body-s">
            <thead>
              <tr className="text-text-muted">
                {['Provider', 'Technology', 'Status', 'Notes'].map((h) => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.provider} className="border-t border-border-hairline">
                  <td className="px-4 py-2 font-medium text-text-primary">{r.provider}</td>
                  <td className="px-4 py-2 text-text-secondary">{r.kind}</td>
                  <td className="px-4 py-2"><span className={'rounded-chip px-1.5 py-0.5 text-caption ' + STATUS[r.status].cls}>{STATUS[r.status].label}</span></td>
                  <td className="px-4 py-2 text-text-secondary">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
