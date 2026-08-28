import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, ExplainedScore, StatusBadge, SeriesTag } from '../components/ui';
import { Rail } from '../components/Rail';
import { CouplingMap } from '../components/charts/CouplingMap';
import { WORKLOADS, CIRCUIT_PROFILES, BACKENDS, CALIBRATIONS } from '../services/demoFixtures';
import { DEFAULT_GOAL, optimize } from '../services/demoEngine';
import { fmtSci, money } from '../components/charts/scale';
import { Reveal, CountUp } from '../components/motion';

// Overview: a live-feeling operational dashboard. Every figure is derived client-side from the
// seeded demo engine — illustrative, never a hardware measurement.
export function Overview() {
  const recent = useMemo(
    () =>
      WORKLOADS.map((w) => {
        const res = optimize(CIRCUIT_PROFILES[w.workload_id]!, BACKENDS, CALIBRATIONS, DEFAULT_GOAL);
        const plan = res.plans.find((p) => p.plan_id === res.recommended_plan_id) ?? null;
        return { w, plan };
      }),
    [],
  );
  const passRate = Math.round((recent.filter((r) => r.plan).length / recent.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="rail-h">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="rail-h" className="text-eyebrow uppercase text-text-secondary">Reliability transformation</h2>
          <Link to="/new-analysis" className="inline-flex items-center gap-1 text-body-s text-series-mitigated hover:underline">
            New analysis <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <Card lit className="hx-border hx-scan overflow-hidden p-5 qo-sweep" style={{ ['--scan-h' as string]: '150px' }}>
          <Rail states={{ circuit: 'complete', hardware: 'complete', noise: 'active' }} />
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <ExplainedScore
          label="Reliability Health (illustrative)"
          value={0.72}
          formula="w1·calibration + w2·strategy_fit + w3·feasibility"
          terms={[
            { label: 'Calibration validity', weight: 0.4, contribution: 0.34 },
            { label: 'Strategy fit', weight: 0.35, contribution: 0.26 },
            { label: 'Goal feasibility', weight: 0.25, contribution: 0.12 },
          ]}
        />
        <Card interactive className="qo-rise p-5" style={{ ['--i' as string]: 1 }}>
          <div className="text-eyebrow uppercase text-text-secondary">Goal pass rate</div>
          <div className="mt-1 metric text-metric-xl text-text-primary qo-text-glow"><CountUp to={passRate} suffix="%" /></div>
          <div className="text-caption text-text-muted">of demo workloads have a feasible recommended strategy</div>
        </Card>
        <Card interactive className="qo-rise p-5" style={{ ['--i' as string]: 2 }}>
          <div className="text-eyebrow uppercase text-text-secondary">Demo backends</div>
          <div className="mt-1 metric text-metric-xl text-text-primary qo-text-glow"><CountUp to={BACKENDS.length} /></div>
          <div className="text-caption text-text-muted">superconducting + ion-trap profiles (simulated calibration)</div>
        </Card>
      </div>

      <section aria-labelledby="hw-h">
        <h2 id="hw-h" className="mb-2 text-eyebrow uppercase text-text-secondary">Active hardware profiles</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {BACKENDS.map((b, i) => (
            <Reveal key={b.backend_id} delay={i * 80}><Card interactive className="flex h-full gap-3 p-4">
              <CouplingMap profile={b} size={92} summary={b.display_name + ' qubit connectivity, ' + b.qubit_count + ' qubits'} />
              <div className="min-w-0">
                <div className="truncate text-body-s font-medium text-text-primary">{b.display_name}</div>
                <div className="text-caption text-text-muted">{b.topology_class}</div>
                <dl className="mt-2 space-y-1 text-caption">
                  <div className="flex justify-between gap-2"><dt className="text-text-muted">qubits</dt><dd className="metric text-text-primary">{b.qubit_count}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-muted">2Q err</dt><dd className="metric text-text-primary">{fmtSci(b.median_two_qubit_error_rate.value)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-muted">readout</dt><dd className="metric text-text-primary">{fmtSci(b.median_readout_error_rate.value)}</dd></div>
                </dl>
              </div>
            </Card></Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="runs-h">
        <h2 id="runs-h" className="mb-2 text-eyebrow uppercase text-text-secondary">Recent analyses</h2>
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-body-s">
              <thead>
                <tr className="text-text-muted">
                  {['Workload', 'Recommended strategy', 'Backend', 'Raw → Mitigated', 'Cost', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(({ w, plan }) => (
                  <tr key={w.workload_id} className="border-t border-border-hairline">
                    <td className="px-4 py-2 text-text-primary">{w.display_name}</td>
                    <td className="px-4 py-2 text-text-secondary">{plan?.strategy.display_name ?? '—'}</td>
                    <td className="px-4 py-2 text-text-secondary">{plan?.backend_id ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-2">
                        <SeriesTag series="raw">{fmtSci(CIRCUIT_PROFILES[w.workload_id]!.estimated_raw_error.value)}</SeriesTag>
                        <span className="text-text-muted">→</span>
                        <SeriesTag series="mitigated">{plan ? fmtSci(plan.rmse.value) : '—'}</SeriesTag>
                      </span>
                    </td>
                    <td className="metric px-4 py-2 text-text-primary">{plan ? money(plan.estimated_cost_usd.value) : '—'}</td>
                    <td className="px-4 py-2">
                      {plan ? <StatusBadge state="healthy">Feasible</StatusBadge> : <StatusBadge state="critical">No plan</StatusBadge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="mt-2 text-caption text-text-muted">All values are illustrative, computed from seeded demo data — not hardware measurements.</p>
      </section>
    </div>
  );
}
