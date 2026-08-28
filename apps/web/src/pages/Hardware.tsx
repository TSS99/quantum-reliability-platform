import { useState } from 'react';
import { Card, StatusBadge } from '../components/ui';
import { CouplingMap } from '../components/charts/CouplingMap';
import { MetricTimeline } from '../components/charts/MetricTimeline';
import { BACKENDS, CALIBRATIONS } from '../services/demoFixtures';
import type { CalibrationValidityState } from '../services/contracts';
import { fmtSci, money } from '../components/charts/scale';

const VALIDITY: Record<CalibrationValidityState, 'healthy' | 'warning' | 'critical' | 'uncertain'> = {
  stable: 'healthy',
  watch: 'uncertain',
  stale: 'warning',
  significant_drift: 'critical',
};
const VALIDITY_LABEL: Record<CalibrationValidityState, string> = {
  stable: 'Stable',
  watch: 'Watch',
  stale: 'Stale',
  significant_drift: 'Significant drift',
};

const notProvided = (v: number | null, f: (n: number) => string) =>
  v === null ? <span className="text-text-muted">Not provided</span> : f(v);

export function Hardware() {
  const [id, setId] = useState(BACKENDS[0]!.backend_id);
  const b = BACKENDS.find((x) => x.backend_id === id)!;
  const cal = CALIBRATIONS[id]!;
  const metric = (sel: (p: (typeof cal.history)[number]) => number) => cal.history.map((p) => ({ t: p.timestamp_utc, v: sel(p) }));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow uppercase text-series-mitigated">Hardware</p>
        <h2 className="font-display text-display-m font-normal">Backend profiles &amp; calibration</h2>
        <p className="mt-1 text-body-s text-text-muted">Simulated device profiles. Unavailable fields read “Not provided”, never zero.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-1.5">
          {BACKENDS.map((x) => {
            const v = CALIBRATIONS[x.backend_id]!.validity.state;
            return (
              <button key={x.backend_id} onClick={() => setId(x.backend_id)} aria-pressed={x.backend_id === id}
                className={'rounded-control border px-3 py-2 text-left transition-colors ' + (x.backend_id === id ? 'border-border-control bg-row-selected' : 'border-border-hairline hover:bg-row-hover')}>
                <div className="text-body-s font-medium text-text-primary">{x.display_name}</div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-caption text-text-muted">{x.qubit_count} qubits</span>
                  <StatusBadge state={VALIDITY[v]}>{VALIDITY_LABEL[v]}</StatusBadge>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="flex flex-col items-center">
              <CouplingMap profile={b} size={180} summary={b.display_name + ' connectivity: ' + b.qubit_count + ' qubits, ' + b.coupling_map.length + ' couplers'} />
              <div className="mt-1 text-caption text-text-muted">{b.topology_class}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-heading-l">{b.display_name}</h3>
                <span className="rounded-chip border border-border-hairline px-1.5 py-0.5 text-caption text-text-muted">{b.adapter_status.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-caption text-text-muted">{b.provider_id}</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-body-s sm:grid-cols-3">
                {[
                  ['qubits', b.qubit_count],
                  ['median 2Q error', fmtSci(b.median_two_qubit_error_rate.value)],
                  ['median readout', fmtSci(b.median_readout_error_rate.value)],
                  ['quantum volume', notProvided(b.quantum_volume, (n) => String(n))],
                  ['dynamic circuits', b.supports_dynamic_circuits ? 'yes' : 'no'],
                  ['delay scheduling', b.supports_delay_scheduling ? 'yes' : 'no'],
                  ['cost / QPU-s', money(b.cost_per_qpu_second_usd.value)],
                  ['basis gates', b.basis_gates.join(', ')],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-caption text-text-muted">{k}</dt>
                    <dd className="metric text-metric-s text-text-primary">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-eyebrow uppercase text-text-secondary">Calibration drift</h3>
              <div className="flex items-center gap-2 text-caption text-text-muted">
                <span>{cal.age_hours.toFixed(1)}h old</span>
                <StatusBadge state={VALIDITY[cal.validity.state]}>{VALIDITY_LABEL[cal.validity.state]}</StatusBadge>
              </div>
            </div>
            {cal.validity.drift_findings.length > 0 && (
              <p className="mb-3 rounded-control border border-border-hairline bg-state-warning-bg p-2 text-body-s text-state-warning">
                {cal.validity.drift_findings[0]!.message}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['2Q error rate', (p: (typeof cal.history)[number]) => p.two_qubit_error_rate.value, 'var(--color-state-critical)', fmtSci],
                ['Readout error', (p: (typeof cal.history)[number]) => p.readout_error_rate.value, 'var(--color-state-warning)', fmtSci],
                ['T1 (µs)', (p: (typeof cal.history)[number]) => p.t1_us.value, 'var(--color-series-mitigated)', (n: number) => n.toFixed(0)],
                ['T2 (µs)', (p: (typeof cal.history)[number]) => p.t2_us.value, 'var(--color-series-logical)', (n: number) => n.toFixed(0)],
              ].map(([label, sel, color, fmt]) => (
                <div key={label as string} className="rounded-control border border-border-hairline bg-bg-base p-2">
                  <div className="mb-1 text-caption text-text-muted">{label as string}</div>
                  <MetricTimeline
                    points={metric(sel as (p: (typeof cal.history)[number]) => number)}
                    color={color as string}
                    format={fmt as (n: number) => string}
                    summary={(label as string) + ' over the last ' + cal.history.length + ' calibrations for ' + b.display_name}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
