import { useMemo, useState } from 'react';
import { Receipt as ReceiptIcon, Copy, Check } from 'lucide-react';
import { Card, StatusBadge, SeriesTag } from '../components/ui';
import { WORKLOADS, CIRCUIT_PROFILES, BACKENDS, CALIBRATIONS } from '../services/demoFixtures';
import { DEFAULT_GOAL, optimize } from '../services/demoEngine';
import type { ExecutionPlan } from '../services/contracts';
import { fmtSci, money } from '../components/charts/scale';

interface Run {
  runId: string;
  createdAt: string;
  workloadName: string;
  rawError: number;
  plan: ExecutionPlan;
}

// A Reliability Receipt: the evidence artifact (Gap B). execution_mode is demo_replay, so the
// actual_* measurements are null by construction — a demo receipt can never claim a real runtime.
function receiptOf(run: Run) {
  const p = run.plan;
  return {
    schema_version: '1.0.0',
    qrp_version: '0.1.0',
    run_id: run.runId,
    generated_at: run.createdAt,
    execution_mode: 'demo_replay' as const,
    workload: run.workloadName,
    circuit_fingerprint: p.circuit_fingerprint,
    backend_id: p.backend_id,
    calibration_snapshot_id: p.calibration_snapshot_id,
    strategy: { id: p.strategy.strategy_id, name: p.strategy.display_name, shots: p.shots },
    raw_error: run.rawError,
    processed_error: p.rmse.value,
    improvement: Number((1 - p.rmse.value / run.rawError).toFixed(3)),
    statistical_confidence: p.statistical_confidence,
    strategy_confidence: p.strategy_confidence,
    estimated_cost_usd: p.estimated_cost_usd.value,
    estimated_qpu_seconds: p.estimated_qpu_seconds.value,
    actual_runtime_seconds: null,
    actual_cost_usd: null,
    provenance: 'demo',
  };
}

export function Experiments() {
  const runs = useMemo<Run[]>(() => {
    const base = Date.parse('2026-08-27T09:00:00Z');
    return WORKLOADS.flatMap((w, wi) => {
      const profile = CIRCUIT_PROFILES[w.workload_id]!;
      const res = optimize(profile, BACKENDS, CALIBRATIONS, DEFAULT_GOAL);
      const plan = res.plans.find((p) => p.plan_id === res.recommended_plan_id);
      if (!plan) return [];
      return [{
        runId: 'run_' + w.workload_id + '_' + plan.backend_id,
        createdAt: new Date(base - wi * 3600_000).toISOString(),
        workloadName: w.display_name,
        rawError: profile.estimated_raw_error.value,
        plan,
      }];
    });
  }, []);
  const [sel, setSel] = useState<string | null>(runs[0]?.runId ?? null);
  const [copied, setCopied] = useState(false);
  const active = runs.find((r) => r.runId === sel) ?? null;
  const receipt = active ? receiptOf(active) : null;

  const copy = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (sandbox) — the JSON is shown below regardless */
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow uppercase text-series-mitigated">Experiments</p>
        <h2 className="font-display text-display-m font-normal">Runs &amp; reliability receipts</h2>
        <p className="mt-1 text-body-s text-text-muted">Each run keeps the evidence that lets you check whether the strategy actually helped. Demo runs — actual measurements are null by design.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,380px)]">
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-body-s">
              <thead>
                <tr className="text-text-muted">
                  {['Run', 'Workload', 'Backend', 'Raw → Processed', 'Cost', ''].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.runId} onClick={() => setSel(r.runId)}
                    className={'cursor-pointer border-t border-border-hairline hover:bg-row-hover ' + (r.runId === sel ? 'bg-row-selected' : '')}>
                    <td className="metric px-4 py-2 text-caption text-text-muted">{r.runId}</td>
                    <td className="px-4 py-2 text-text-primary">{r.workloadName}</td>
                    <td className="px-4 py-2 text-text-secondary">{r.plan.backend_id}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <SeriesTag series="raw">{fmtSci(r.rawError)}</SeriesTag>
                        <span className="text-text-muted">→</span>
                        <SeriesTag series="mitigated">{fmtSci(r.plan.rmse.value)}</SeriesTag>
                      </span>
                    </td>
                    <td className="metric px-4 py-2 text-text-primary">{money(r.plan.estimated_cost_usd.value)}</td>
                    <td className="px-4 py-2"><ReceiptIcon size={14} className="text-text-muted" aria-label="view receipt" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {receipt && active && (
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-heading-m">Reliability receipt</h3>
              <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-control border border-border-control px-2 py-1 text-caption text-text-secondary hover:bg-row-hover">
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-control border border-border-hairline bg-state-healthy-bg p-2">
              <span className="text-body-s text-state-healthy">improvement</span>
              <span className="metric text-metric-m text-state-healthy">{(receipt.improvement * 100).toFixed(0)}%</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-s">
              {[
                ['raw error', fmtSci(receipt.raw_error)],
                ['processed', fmtSci(receipt.processed_error)],
                ['stat. confidence', (receipt.statistical_confidence * 100).toFixed(0) + '%'],
                ['strategy conf.', (receipt.strategy_confidence * 100).toFixed(0) + '%'],
                ['est. cost', money(receipt.estimated_cost_usd)],
                ['est. QPU time', receipt.estimated_qpu_seconds.toFixed(0) + 's'],
                ['actual runtime', 'null (demo)'],
                ['actual cost', 'null (demo)'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-caption text-text-muted">{k}</dt>
                  <dd className="metric text-metric-s text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
            <details className="text-caption">
              <summary className="cursor-pointer text-text-secondary">Raw receipt JSON</summary>
              <pre className="mono mt-1 max-h-56 overflow-auto rounded-control border border-border-hairline bg-bg-base p-2 text-[11px] text-text-secondary">
                {JSON.stringify(receipt, null, 2)}
              </pre>
            </details>
          </Card>
        )}
      </div>

      <section aria-labelledby="cmp-h">
        <h2 id="cmp-h" className="mb-2 text-eyebrow uppercase text-text-secondary">Run comparison — mitigation improvement</h2>
        <Card className="p-4">
          <div className="flex flex-col gap-2">
            {runs.map((r) => {
              const imp = Math.max(0, 1 - r.plan.rmse.value / r.rawError);
              return (
                <div key={r.runId} className="grid grid-cols-[130px_1fr_auto] items-center gap-3 text-body-s">
                  <span className="truncate text-text-secondary">{r.workloadName}</span>
                  <div className="h-2 rounded-full bg-bg-raised" role="img" aria-label={r.workloadName + ' improvement ' + (imp * 100).toFixed(0) + '%'}>
                    <div className="h-2 rounded-full bg-series-mitigated transition-all" style={{ width: (imp * 100).toFixed(0) + '%' }} />
                  </div>
                  <span className="metric w-32 text-right text-text-primary">
                    {(imp * 100).toFixed(0)}% <span className="text-text-muted">·</span> {money(r.plan.estimated_cost_usd.value)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-caption text-text-muted">Error reduction versus the raw baseline for each recommended run — illustrative demo data.</p>
        </Card>
      </section>
    </div>
  );
}
