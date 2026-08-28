import { useMemo, useState } from 'react';
import { Cpu, Zap, ShieldCheck, Ban, TriangleAlert, HelpCircle } from 'lucide-react';
import { Card, ExplainedScore } from '../components/ui';
import { ParetoFront } from '../components/charts/ParetoFront';
import { WORKLOADS, CIRCUIT_PROFILES, BACKENDS, CALIBRATIONS } from '../services/demoFixtures';
import { DEFAULT_GOAL, optimize, paretoFront, preflight } from '../services/demoEngine';
import type { PriorityPreset, PreflightStatus } from '../services/contracts';
import { fmtSci, money } from '../components/charts/scale';
import { QASM_TEMPLATES, QasmError, parseQasm, toCircuitProfile } from '../services/qasm';

const PRESETS: { id: PriorityPreset; label: string }[] = [
  { id: 'minimize_cost', label: 'Minimize cost' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'maximize_accuracy', label: 'Maximize accuracy' },
];

const STATUS: Record<PreflightStatus, { label: string; Icon: typeof Ban; fg: string; bg: string }> = {
  RUN: { label: 'Recommended to run', Icon: ShieldCheck, fg: 'text-state-healthy', bg: 'bg-state-healthy-bg' },
  RUN_WITH_WARNING: { label: 'Run with warnings', Icon: TriangleAlert, fg: 'text-state-warning', bg: 'bg-state-warning-bg' },
  DO_NOT_RUN: { label: 'Do not run', Icon: Ban, fg: 'text-state-critical', bg: 'bg-state-critical-bg' },
  INSUFFICIENT_DATA: { label: 'Insufficient data', Icon: HelpCircle, fg: 'text-state-uncertain', bg: 'bg-state-uncertain-bg' },
};

// Flow A, computed entirely client-side from seeded demo data (illustrative, not a measurement).
export function NewAnalysis() {
  const [workloadId, setWorkloadId] = useState(WORKLOADS[0]!.workload_id);
  const [priority, setPriority] = useState<PriorityPreset>('balanced');
  const [targetError, setTargetError] = useState(DEFAULT_GOAL.target_error);
  const [source, setSource] = useState<'example' | 'custom'>('example');
  const [qasm, setQasm] = useState(QASM_TEMPLATES[0]!.qasm);

  const workload = WORKLOADS.find((w) => w.workload_id === workloadId)!;

  // A user circuit is priced by the SAME error-budget model as the built-in examples, so the
  // comparison stays honest — it is not a separate, easier path.
  const custom = useMemo(() => {
    if (source !== 'custom') return null;
    try {
      const parsed = parseQasm(qasm);
      const cal = CALIBRATIONS[BACKENDS[0]!.backend_id]!;
      return { parsed, profile: toCircuitProfile(parsed, cal), error: null as string | null };
    } catch (e) {
      return { parsed: null, profile: null, error: e instanceof QasmError ? e.message : 'Could not parse this circuit.' };
    }
  }, [source, qasm]);

  const profile = (custom?.profile ?? CIRCUIT_PROFILES[workloadId])!;

  const { result, pareto, recommended, verdict } = useMemo(() => {
    const goal = { ...DEFAULT_GOAL, priority, target_error: targetError };
    if (!profile) {
      return { result: { plans: [], recommended_plan_id: null }, pareto: new Set<string>(), recommended: null, verdict: null };
    }
    const result = optimize(profile, BACKENDS, CALIBRATIONS, goal);
    const pareto = paretoFront(result.plans);
    const recommended = result.plans.find((p) => p.plan_id === result.recommended_plan_id) ?? null;
    const verdict = recommended ? preflight(recommended, goal) : null;
    return { result, pareto, recommended, verdict };
  }, [profile, priority, targetError]);

  const st = verdict ? STATUS[verdict.status] : STATUS.DO_NOT_RUN;
  const ranked = [...result.plans].sort((a, b) => (b.score?.value ?? -1) - (a.score?.value ?? -1)).slice(0, 6);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow uppercase text-series-mitigated">New analysis</p>
        <h2 className="font-display text-display-m font-normal">Choose a reliability strategy for {source === 'custom' ? 'your circuit' : workload.display_name}</h2>
        <p className="mt-1 text-body-s text-text-muted">
          Circuit → hardware → strategies → cost/error → recommendation, computed client-side from
          seeded demo data. Illustrative, not a hardware measurement.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <Card lit className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-eyebrow uppercase text-text-secondary">1 · Workload</h3>
              <div className="flex rounded-chip border border-border-hairline p-0.5">
                {(['example', 'custom'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSource(m)}
                    aria-pressed={source === m}
                    className={
                      'rounded-chip px-2.5 py-1 text-caption transition-all duration-200 ' +
                      (source === m
                        ? 'bg-action-bg text-action-fg font-medium'
                        : 'text-text-secondary hover:text-text-primary')
                    }
                  >
                    {m === 'example' ? 'Examples' : 'Your circuit'}
                  </button>
                ))}
              </div>
            </div>

            {source === 'example' ? (
              <div className="flex flex-col gap-1.5">
                {WORKLOADS.map((w) => (
                  <button
                    key={w.workload_id}
                    onClick={() => setWorkloadId(w.workload_id)}
                    aria-pressed={w.workload_id === workloadId}
                    className={
                      'hx-spot rounded-control border px-3 py-2 text-left text-body-s transition-colors ' +
                      (w.workload_id === workloadId
                        ? 'border-border-control bg-row-selected'
                        : 'border-border-hairline hover:bg-row-hover')
                    }
                  >
                    <div className="font-medium text-text-primary">{w.display_name}</div>
                    <div className="text-caption text-text-muted">
                      {w.qubit_count} qubits · ⟨{w.observable}⟩
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {QASM_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setQasm(t.qasm)}
                      className="rounded-chip border border-border-hairline px-2 py-1 text-caption text-text-secondary transition-colors hover:border-border-control hover:text-text-primary"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <label htmlFor="qasm" className="sr-only">OpenQASM circuit</label>
                <textarea
                  id="qasm"
                  value={qasm}
                  onChange={(e) => setQasm(e.target.value)}
                  spellCheck={false}
                  rows={12}
                  placeholder="OPENQASM 2.0; include qelib1.inc; qreg q[2]; h q[0]; cx q[0],q[1];"
                  className="mono w-full resize-y rounded-control border border-border-hairline bg-bg-base p-2.5 text-[12px] leading-relaxed text-text-primary outline-none transition-colors focus:border-series-mitigated"
                />

                {custom?.error ? (
                  <p className="rounded-control border border-border-hairline bg-state-critical-bg px-2.5 py-2 text-caption text-state-critical">
                    {custom.error}
                  </p>
                ) : custom?.parsed ? (
                  <div className="rounded-control border border-border-hairline bg-state-healthy-bg px-2.5 py-2">
                    <div className="text-caption text-state-healthy">
                      Parsed OpenQASM {custom.parsed.qasm_version} · {custom.parsed.qubit_count} qubits ·{' '}
                      {custom.parsed.total_gate_count} gates
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(custom.parsed.gate_histogram).slice(0, 8).map(([g, n]) => (
                        <span key={g} className="mono rounded-chip border border-border-hairline px-1.5 text-[10px] text-text-muted">
                          {g}×{n}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <p className="text-caption text-text-muted">
                  Parsed in your browser — nothing is uploaded. Depth is approximated without a scheduler.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-eyebrow uppercase text-text-secondary">2 · Circuit analysis</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-s">
              {([
                ['qubits', profile.qubit_count],
                ['depth', profile.depth],
                ['2Q gates', profile.two_qubit_gate_count],
                ['measurements', profile.measurement_count],
                ['idle exposure', fmtSci(profile.idle_exposure.value)],
                ['raw error', fmtSci(profile.estimated_raw_error.value)],
              ] as [string, string | number][]).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-caption text-text-muted">{k}</dt>
                  <dd className="metric text-metric-s text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-eyebrow uppercase text-text-secondary">3 · Reliability goal</h3>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  aria-pressed={p.id === priority}
                  className={
                    'rounded-chip border px-2 py-1 text-caption transition-colors ' +
                    (p.id === priority
                      ? 'border-border-control bg-row-selected text-text-primary'
                      : 'border-border-hairline text-text-secondary hover:bg-row-hover')
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label htmlFor="target-error" className="block text-caption text-text-muted">
              target error ≤ <span className="metric text-text-primary">{fmtSci(targetError)}</span>
            </label>
            <input
              id="target-error"
              type="range"
              min={-3}
              max={-1}
              step={0.1}
              value={Math.log10(targetError)}
              onChange={(e) => setTargetError(10 ** Number(e.target.value))}
              className="mt-1 w-full"
              style={{ accentColor: 'var(--color-series-mitigated)' }}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-eyebrow uppercase text-text-secondary">4 · Cost vs error — Pareto explorer</h3>
              <span className="text-caption text-text-muted">
                {result.plans.filter((p) => p.feasibility === 'feasible').length} feasible · {pareto.size} optimal
              </span>
            </div>
            <ParetoFront
              plans={result.plans}
              paretoIds={pareto}
              recommendedId={result.recommended_plan_id}
              summary={
                'Cost versus expected error for ' +
                result.plans.length +
                ' candidate strategies across ' +
                BACKENDS.length +
                ' demo backends; ' +
                pareto.size +
                ' are Pareto-optimal.'
              }
            />
          </Card>

          <div className={'rounded-card border border-border-hairline p-4 ' + st.bg}>
            <div className="flex items-center gap-2">
              <st.Icon className={st.fg} size={18} aria-hidden />
              <span className={'text-heading-m ' + st.fg}>{st.label}</span>
            </div>
            <p className="mt-1 text-body-s text-text-secondary">
              {verdict?.summary ??
                'No feasible strategy meets the current constraints — relax the target error or raise the budget.'}
            </p>
            {recommended && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-control border border-border-hairline bg-bg-base p-3">
                  <div className="flex items-center gap-2 text-body-s">
                    <Zap size={14} className="text-series-mitigated" aria-hidden />
                    <span className="font-medium">{recommended.strategy.display_name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-caption text-text-muted">
                    <Cpu size={12} aria-hidden />
                    {recommended.backend_id}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-body-s">
                    <div><dt className="text-caption text-text-muted">expected error</dt><dd className="metric text-text-primary">{fmtSci(recommended.rmse.value)}</dd></div>
                    <div><dt className="text-caption text-text-muted">cost</dt><dd className="metric text-text-primary">{money(recommended.estimated_cost_usd.value)}</dd></div>
                    <div><dt className="text-caption text-text-muted">QPU time</dt><dd className="metric text-text-primary">{recommended.estimated_qpu_seconds.value.toFixed(0)}s</dd></div>
                    <div><dt className="text-caption text-text-muted">shots</dt><dd className="metric text-text-primary">{recommended.shots.toLocaleString()}</dd></div>
                  </dl>
                </div>
                {recommended.score && (
                  <ExplainedScore
                    label="Strategy score"
                    value={recommended.score.value}
                    defaultOpen
                    formula={recommended.score.explanation}
                    terms={recommended.score.terms.map((t) => ({ label: t.name, weight: t.weight, contribution: t.contribution }))}
                  />
                )}
              </div>
            )}
          </div>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-border-hairline px-4 py-2 text-eyebrow uppercase text-text-secondary">Candidate strategies</div>
            <div className="overflow-x-auto">
              <table className="w-full text-body-s">
                <thead>
                  <tr className="text-text-muted">
                    {['Strategy', 'Backend', 'Error', 'Cost', 'Feasible'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((p) => (
                    <tr key={p.plan_id} className={'border-t border-border-hairline ' + (p.plan_id === result.recommended_plan_id ? 'bg-row-selected' : '')}>
                      <td className="px-4 py-2 text-text-primary">{p.strategy.display_name}</td>
                      <td className="px-4 py-2 text-text-secondary">{p.backend_id}</td>
                      <td className="metric px-4 py-2 text-text-primary">{fmtSci(p.rmse.value)}</td>
                      <td className="metric px-4 py-2 text-text-primary">{money(p.estimated_cost_usd.value)}</td>
                      <td className="px-4 py-2">
                        {p.feasibility === 'feasible' ? <span className="text-state-healthy">✓</span> : <span className="text-state-uncertain">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
