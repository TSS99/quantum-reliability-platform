import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Play, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from './ui';
import {
  backend,
  getEndpoint,
  hasToken,
  type ExecutionPolicy,
  type HardwareJob,
} from '../services/backendSession';
import { WORKLOADS } from '../services/demoFixtures';

type Phase =
  | { s: 'unconfigured' }
  | { s: 'loading' }
  | { s: 'policy'; policy: ExecutionPolicy }
  | { s: 'submitting'; policy: ExecutionPolicy }
  | { s: 'tracking'; policy: ExecutionPolicy; job: HardwareJob }
  | { s: 'error'; message: string; code: string };

const POLL_MS = 5000;

/**
 * Submit a circuit to real hardware and follow it.
 *
 * This is the only surface in the product that can spend someone's quota, so it states the
 * deployment's policy — spend ceiling, plan rule, shot cap, job durability — before offering the
 * button, and it reports a refusal with the backend's own reason code rather than a generic
 * failure. A real job takes minutes to hours, so the flow is submit-then-poll, and the UI never
 * pretends to have a result it does not have.
 */
export function HardwareExecution() {
  const [phase, setPhase] = useState<Phase>({ s: 'unconfigured' });
  const [workloadId, setWorkloadId] = useState(WORKLOADS[0]?.workload_id ?? '');
  const [backendId, setBackendId] = useState('');
  const [shots, setShots] = useState(1024);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!getEndpoint()) return;
    setPhase({ s: 'loading' });
    backend
      .executionPolicy()
      .then((policy) => setPhase({ s: 'policy', policy }))
      .catch((e: { message: string; code?: string }) =>
        setPhase({ s: 'error', message: e.message, code: e.code ?? 'UNKNOWN' }),
      );
  }, []);

  // Poll while a job is live. Cleared on unmount so a navigation does not leave a timer running.
  useEffect(() => {
    if (phase.s !== 'tracking') return;
    const { job } = phase;
    if (job.status === 'completed' || job.status === 'failed') return;

    timer.current = window.setTimeout(async () => {
      try {
        const next = await backend.pollJob(job.job_id);
        setPhase((p) => (p.s === 'tracking' ? { ...p, job: next } : p));
      } catch (e) {
        const err = e as { message: string; code?: string };
        setPhase({ s: 'error', message: err.message, code: err.code ?? 'UNKNOWN' });
      }
    }, POLL_MS);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [phase]);

  if (phase.s === 'unconfigured' || (phase.s === 'error' && phase.code === 'NO_ENDPOINT')) {
    return (
      <Card className="p-4">
        <h3 className="text-heading-m text-text-primary">Run on real hardware</h3>
        <p className="mt-1.5 text-body-s text-text-secondary">
          Needs a QRP backend — the static prototype cannot submit jobs on its own. Configure an
          endpoint and hold your IBM token in{' '}
          <Link to="/settings" className="text-series-mitigated hover:underline">
            Settings
          </Link>
          .
        </p>
      </Card>
    );
  }

  if (phase.s === 'loading') {
    return (
      <Card className="flex items-center gap-2 p-4 text-body-s text-text-muted">
        <Loader2 size={15} className="animate-spin" aria-hidden /> Reading the deployment&rsquo;s
        execution policy…
      </Card>
    );
  }

  if (phase.s === 'error') {
    return (
      <Card className="border-state-critical/30 p-4">
        <h3 className="flex items-center gap-1.5 text-heading-m text-state-critical">
          <AlertTriangle size={15} aria-hidden /> {phase.code}
        </h3>
        <p className="mt-1.5 text-body-s text-text-secondary">{phase.message}</p>
      </Card>
    );
  }

  const policy = phase.policy;
  const workload = WORKLOADS.find((w) => w.workload_id === workloadId);
  const busy = phase.s === 'submitting';
  const job = phase.s === 'tracking' ? phase.job : null;

  async function submit() {
    if (!workload || !backendId.trim()) return;
    setPhase({ s: 'submitting', policy });
    try {
      const created = await backend.submitJob({
        qasm: workload.qasm,
        backend_id: backendId.trim(),
        shots,
      });
      setPhase({ s: 'tracking', policy, job: created });
    } catch (e) {
      const err = e as { message: string; code?: string };
      setPhase({ s: 'error', message: err.message, code: err.code ?? 'UNKNOWN' });
    }
  }

  return (
    <Card className="p-4">
      <h3 className="text-heading-m text-text-primary">Run on real hardware</h3>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-control border border-border-hairline bg-bg-base p-3 text-caption sm:grid-cols-4">
        <div>
          <dt className="text-text-muted">submission</dt>
          <dd className={'metric ' + (policy.submission_enabled ? 'text-state-healthy' : 'text-state-warning')}>
            {policy.submission_enabled ? 'enabled' : 'disabled'}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">spend ceiling</dt>
          <dd className="metric text-text-primary">${policy.spend_ceiling_usd}</dd>
        </div>
        <div>
          <dt className="text-text-muted">plans allowed</dt>
          <dd className="metric text-text-primary">{policy.plan_policy.replace(/_/g, ' ')}</dd>
        </div>
        <div>
          <dt className="text-text-muted">max shots</dt>
          <dd className="metric text-text-primary">{policy.max_shots.toLocaleString()}</dd>
        </div>
      </dl>

      {!policy.submission_enabled && (
        <p className="mt-3 text-body-s text-text-secondary">
          This deployment has hardware submission switched off. Calibration reads still work and
          cost nothing; submission stays disabled until it is explicitly enabled server-side.
        </p>
      )}

      {policy.submission_enabled && (
        <>
          {!hasToken() && (
            <p className="mt-3 rounded-control border border-state-warning/30 bg-bg-base p-2.5 text-caption text-text-secondary">
              No IBM token is held in this tab. Add one in{' '}
              <Link to="/settings" className="text-series-mitigated hover:underline">
                Settings
              </Link>{' '}
              — jobs run against your own account, never a shared one.
            </p>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-caption text-text-muted">
              Circuit
              <select
                value={workloadId}
                onChange={(e) => setWorkloadId(e.target.value)}
                className="rounded-control border border-border-control bg-bg-base px-2.5 py-2 text-body-s text-text-primary"
              >
                {WORKLOADS.map((w) => (
                  <option key={w.workload_id} value={w.workload_id}>
                    {w.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-caption text-text-muted">
              Backend
              <input
                value={backendId}
                onChange={(e) => setBackendId(e.target.value)}
                placeholder="ibm_brisbane"
                spellCheck={false}
                className="mono rounded-control border border-border-control bg-bg-base px-2.5 py-2 text-body-s text-text-primary placeholder:text-text-muted"
              />
            </label>
            <label className="flex flex-col gap-1 text-caption text-text-muted">
              Shots (max {policy.max_shots.toLocaleString()})
              <input
                type="number"
                min={1}
                max={policy.max_shots}
                value={shots}
                onChange={(e) => setShots(Number(e.target.value))}
                className="mono rounded-control border border-border-control bg-bg-base px-2.5 py-2 text-body-s text-text-primary"
              />
            </label>
          </div>

          <button
            onClick={submit}
            disabled={busy || !backendId.trim() || !hasToken()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-border-control px-3.5 py-2 text-body-s text-text-secondary hover:bg-row-hover disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Play size={14} aria-hidden />}
            Submit to hardware
          </button>
        </>
      )}

      {job && (
        <div className="mt-4 rounded-control border border-border-hairline bg-bg-base p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="metric text-body-s text-text-primary">{job.job_id}</span>
            <span
              className={
                'inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-caption ' +
                (job.status === 'completed'
                  ? 'border-state-healthy/40 text-state-healthy'
                  : job.status === 'failed'
                    ? 'border-state-critical/40 text-state-critical'
                    : 'border-border-hairline text-text-secondary')
              }
            >
              {job.status === 'completed' ? (
                <CheckCircle2 size={12} aria-hidden />
              ) : job.status === 'failed' ? (
                <AlertTriangle size={12} aria-hidden />
              ) : (
                <Loader2 size={12} className="animate-spin" aria-hidden />
              )}
              {job.status}
            </span>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            {job.backend_id} · {job.shots.toLocaleString()} shots · job state is{' '}
            {job.durability.replace(/_/g, '-')} and is lost if the backend restarts
          </p>

          {job.error && (
            <p className="mt-2 text-caption text-text-secondary">
              <span className="metric text-state-critical">{job.error_code}</span> — {job.error}
            </p>
          )}

          {job.counts && (
            <div className="mt-3">
              <div className="text-caption text-text-muted">
                measured counts · provenance{' '}
                <span className="metric text-state-healthy">{job.provenance}</span>
              </div>
              <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                {Object.entries(job.counts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([bits, n]) => (
                    <li key={bits} className="flex items-center justify-between gap-2 text-caption">
                      <span className="metric text-text-secondary">{bits}</span>
                      <span className="metric text-text-primary">{n.toLocaleString()}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
