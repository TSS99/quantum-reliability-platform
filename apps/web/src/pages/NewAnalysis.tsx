import { useMemo, useState } from 'react';
import { Cpu, Zap, ShieldCheck, Ban, TriangleAlert, HelpCircle } from 'lucide-react';
import { Card, ExplainedScore } from '../components/ui';
import { Rail } from '../components/Rail';
import { ParetoFront } from '../components/charts/ParetoFront';
import { QecEscalation } from '../components/QecEscalation';
import { WORKLOADS, CIRCUIT_PROFILES, BACKENDS, CALIBRATIONS } from '../services/demoFixtures';
import { DEFAULT_GOAL, optimize, paretoFront, preflight } from '../services/demoEngine';
import type {
  OptimizeResponse,
  PreflightStatus,
  PriorityPreset,
  ReliabilityGoal,
} from '../services/contracts';
import { fmtSci, money } from '../components/charts/scale';
import { QASM_TEMPLATES, QasmError, parseQasm, toCircuitProfile, validateObservable } from '../services/qasm';

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
  // RECON-10 / SCIENTIFIC_ASSUMPTIONS: target_error is absolute error on a NORMALISED OBSERVABLE.
  // A circuit without a declared estimand has no defined error, so we require one.
  const [taskType, setTaskType] = useState<'observable' | 'sampling'>('observable');
  const [observable, setObservable] = useState('ZZ');
  const [paretoAxis, setParetoAxis] = useState<'cost' | 'runtime' | 'shots'>('cost');

  const workload = WORKLOADS.find((w) => w.workload_id === workloadId)!;

  // A user circuit is priced by the SAME error-budget model as the built-in examples, so the
  // comparison stays honest — it is not a separate, easier path.
  const custom = useMemo(() => {
    if (source !== 'custom') return null;
    try {
      const parsed = parseQasm(qasm);
      const cal = CALIBRATIONS[BACKENDS[0]!.backend_id]!;
      return { parsed, profile: toCircuitProfile(parsed, cal, qasm), error: null as string | null };
    } catch (e) {
      return { parsed: null, profile: null, error: e instanceof QasmError ? e.message : 'Could not parse this circuit.' };
    }
  }, [source, qasm]);

  const profile = (custom?.profile ?? CIRCUIT_PROFILES[workloadId])!;

  const obsCheck = useMemo(
    () =>
      taskType === 'observable' && profile
        ? validateObservable(observable, profile.qubit_count)
        : ({ ok: true } as const),
    [taskType, observable, profile],
  );

  const { result, pareto, recommended, verdict } = useMemo(() => {
    const goal: ReliabilityGoal = {
      ...DEFAULT_GOAL,
      priority,
      target_error: targetError,
      task:
        taskType === 'observable'
          ? {
              type: 'observable',
              metric: 'absolute_expectation_error',
              observable: observable.trim().toUpperCase(),
            }
          : { type: 'sampling', metric: 'total_variation_distance', observable: null },
    };
    if (!profile) {
      return {
        result: { plans: [], recommended_plan_id: null } as Pick<
          OptimizeResponse,
          'plans' | 'recommended_plan_id'
        > & { unsupported?: OptimizeResponse['unsupported'] },
        pareto: new Set<string>(),
        recommended: null,
        verdict: null,
      };
    }
    const result = optimize(profile, BACKENDS, CALIBRATIONS, goal);
    const pareto = paretoFront(result.plans);
    const recommended = result.plans.find((p) => p.plan_id === result.recommended_plan_id) ?? null;
    const verdict = recommended ? preflight(recommended, goal) : null;
    return { result, pareto, recommended, verdict };
  }, [profile, priority, targetError, taskType, observable]);

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

      {/* The stage rail reflects the ACTUAL state of this analysis, so the page tells the whole
          story without the user navigating elsewhere. */}
      <Card className="px-4 py-3">
        <Rail
          states={{
            circuit: custom?.error ? 'blocked' : 'complete',
            hardware: 'complete',
            noise: 'complete',
            strategy: result.plans.length ? 'complete' : 'pending',
            execution: verdict?.status === 'DO_NOT_RUN' ? 'blocked' : recommended ? 'active' : 'pending',
            verification: 'pending',
          }}
        />
      </Card>

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

                {/* Without a declared estimand, "error" has no meaning for a user circuit
                    (SCIENTIFIC_ASSUMPTIONS: absolute error on a normalised observable). */}
                <div className="rounded-control border border-border-hairline bg-bg-base p-2.5">
                  <div className="text-caption text-text-muted">What are you estimating?</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {([['observable', 'Observable ⟨O⟩'], ['sampling', 'Sampling distribution']] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setTaskType(id)}
                        aria-pressed={taskType === id}
                        className={
                          'rounded-chip border px-2 py-1 text-caption transition-colors ' +
                          (taskType === id
                            ? 'border-border-control bg-row-selected text-text-primary'
                            : 'border-border-hairline text-text-secondary hover:bg-row-hover')
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {taskType === 'observable' ? (
                    <div className="mt-2">
                      <label htmlFor="obs" className="text-caption text-text-muted">Pauli observable</label>
                      <input
                        id="obs"
                        value={observable}
                        onChange={(e) => setObservable(e.target.value.toUpperCase())}
                        className="mono mt-1 w-full rounded-control border border-border-hairline bg-bg-surface px-2 py-1 text-body-s text-text-primary outline-none focus:border-series-mitigated"
                        placeholder="ZZ"
                      />
                      {obsCheck.ok ? (
                        <p className="mt-1 text-caption text-text-muted">
                          Target error is absolute error on ⟨{observable || 'O'}⟩, normalised to
                          [-1, 1]. The observable defines the reported metric; the current predictor
                          is structural and does not yet model observable-specific noise sensitivity.
                        </p>
                      ) : (
                        <p className="mt-1 text-caption text-state-warning">{obsCheck.reason}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-caption text-state-warning">
                      Sampling tasks are measured by distribution distance (TVD), not observable
                      error — expectation-value strategies such as ZNE do not apply. Not yet
                      modelled, so the optimizer will decline rather than score this with the wrong
                      model.
                    </p>
                  )}
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
                    {custom.parsed.has_mid_circuit_measurement && (
                      <div className="mt-1 text-caption text-state-warning">
                        Mid-circuit measurement detected — ZNE folding is not valid for this circuit.
                      </div>
                    )}
                    {custom.parsed.dynamic_uncertain && (
                      <div className="mt-1 text-caption text-state-uncertain">
                        Dynamic-circuit compatibility: uncertain — exact backend analysis required
                        before ZNE eligibility can be confirmed.
                      </div>
                    )}
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
            <h3 className="mb-2 text-eyebrow uppercase text-text-secondary">2 · Circuit structure</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-s">
              {([
                ['qubits', profile.qubit_count],
                ['depth', profile.depth],
                ['2Q gates', profile.two_qubit_gate_count],
                ['measurements', profile.measurement_count],
                ['idle exposure', fmtSci(profile.idle_exposure.value)],
                ['dynamic', profile.has_mid_circuit_measurement ? 'mid-circuit' : 'static'],
              ] as [string, string | number][]).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-caption text-text-muted">{k}</dt>
                  <dd className="metric text-metric-s text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 border-t border-border-hairline pt-2 text-caption text-text-muted">
              Structure only. Predicted raw error is backend-dependent and is shown per candidate below.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-eyebrow uppercase text-text-secondary">3 · Reliability objective</h3>
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

            {/* These constraints decide feasibility, so a verdict is not auditable while they are
                hidden. Shown explicitly rather than applied silently. */}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border-hairline pt-2.5 text-caption">
              <div className="flex justify-between gap-2">
                <dt className="text-text-muted">confidence</dt>
                <dd className="metric text-text-secondary">{(DEFAULT_GOAL.statistical_confidence * 100).toFixed(0)}%</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-muted">max cost</dt>
                <dd className="metric text-text-secondary">{money(DEFAULT_GOAL.max_cost_usd)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-muted">max runtime</dt>
                <dd className="metric text-text-secondary">{DEFAULT_GOAL.max_runtime_seconds}s</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-muted">priority</dt>
                <dd className="metric text-text-secondary">{priority.replace('_', ' ')}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {(result.unsupported || !obsCheck.ok) && (
            <Card className="border-state-warning/40 p-4">
              <h3 className="text-heading-m text-state-warning">Analysis stopped</h3>
              <p className="mt-1.5 text-body-s text-text-secondary">
                {result.unsupported
                  ? result.unsupported.message
                  : !obsCheck.ok
                    ? obsCheck.reason
                    : null}
              </p>
              <p className="mt-2 text-caption text-text-muted">
                No ranking is shown because none would mean anything. The optimizer models absolute
                error on an observable; it does not silently reuse that model for another task.
              </p>
            </Card>
          )}

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-eyebrow uppercase text-text-secondary">5 · Compare strategies — cost vs error</h3>
              <span className="text-caption text-text-muted">
                {result.plans.filter((p) => p.feasibility === 'feasible').length} feasible · {pareto.size} optimal
              </span>
            </div>
            <ParetoFront
              plans={result.plans}
              paretoIds={pareto}
              recommendedId={result.recommended_plan_id}
              maxCostUsd={DEFAULT_GOAL.max_cost_usd}
              maxRuntimeSeconds={DEFAULT_GOAL.max_runtime_seconds}
              targetError={targetError}
              axis={paretoAxis}
              onAxisChange={setParetoAxis}
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
            <div className="mb-1.5 text-eyebrow uppercase text-text-secondary">6 · Decision</div>
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

          {recommended && recommended.rmse.value > targetError && (
            <QecEscalation
              bestRmse={recommended.rmse.value}
              targetError={targetError}
              physicalErrorRate={
                CALIBRATIONS[recommended.backend_id]?.history.at(-1)?.two_qubit_error_rate.value ?? 0.01
              }
              backendId={recommended.backend_id}
              logicalQubits={profile.qubit_count}
              logicalDepth={profile.depth}
            />
          )}

          <Card className="overflow-hidden p-0">
            <div className="border-b border-border-hairline px-4 py-2 text-eyebrow uppercase text-text-secondary">7 · Candidate strategies &amp; why they ranked</div>
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
