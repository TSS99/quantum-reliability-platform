import { useState } from 'react';
import { Sun, Moon, Database, Server, KeyRound, ShieldCheck, Loader2 } from 'lucide-react';
import { Card } from '../components/ui';
import { useTheme } from '../app/useTheme';
import {
  backend,
  clearToken,
  getEndpoint,
  hasToken,
  setEndpoint,
  setToken,
  type ExecutionPolicy,
} from '../services/backendSession';

type Probe =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok'; version: string; policy: ExecutionPolicy }
  | { state: 'error'; message: string; code: string };

export function Settings() {
  const { theme, toggle } = useTheme();
  const [url, setUrl] = useState(getEndpoint() ?? '');
  const [token, setTokenInput] = useState('');
  const [tokenHeld, setTokenHeld] = useState(hasToken());
  const [probe, setProbe] = useState<Probe>({ state: 'idle' });

  async function connect() {
    setEndpoint(url);
    setProbe({ state: 'checking' });
    try {
      const health = await backend.health();
      const policy = await backend.executionPolicy();
      setProbe({ state: 'ok', version: health.qrp_version, policy });
    } catch (e) {
      const err = e as { message: string; code?: string };
      setProbe({ state: 'error', message: err.message, code: err.code ?? 'UNKNOWN' });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow uppercase text-series-mitigated">Settings</p>
        <h2 className="font-display text-display-m font-normal">Preferences and connection</h2>
        <p className="mt-1 text-body-s text-text-muted">
          The prototype runs entirely in your browser. Connect a backend only if you want real
          hardware calibration or execution.
        </p>
      </header>

      {/* ------------------------------------------------------------- backend */}
      <Card className="p-0">
        <div className="border-b border-border-hairline p-4">
          <div className="flex items-center gap-1.5 text-body-s font-medium text-text-primary">
            <Server size={14} className="text-series-mitigated" aria-hidden /> Backend endpoint
          </div>
          <p className="mt-1 text-caption text-text-muted">
            A QRP API instance. Leave empty to stay fully offline on seeded demo data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://qrp-api.onrender.com"
              spellCheck={false}
              aria-label="Backend endpoint URL"
              className="mono min-w-0 flex-1 rounded-control border border-border-control bg-bg-base px-3 py-2 text-body-s text-text-primary placeholder:text-text-muted"
            />
            <button
              onClick={connect}
              disabled={probe.state === 'checking'}
              className="inline-flex items-center gap-1.5 rounded-control border border-border-control px-3 py-2 text-body-s text-text-secondary hover:bg-row-hover disabled:opacity-60"
            >
              {probe.state === 'checking' && <Loader2 size={14} className="animate-spin" aria-hidden />}
              Connect
            </button>
          </div>

          {probe.state === 'ok' && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-control border border-state-healthy/30 bg-bg-base p-3 text-caption sm:grid-cols-4">
              <div>
                <dt className="text-text-muted">status</dt>
                <dd className="metric text-state-healthy">connected</dd>
              </div>
              <div>
                <dt className="text-text-muted">api version</dt>
                <dd className="metric text-text-primary">{probe.version}</dd>
              </div>
              <div>
                <dt className="text-text-muted">submission</dt>
                <dd className="metric text-text-primary">
                  {probe.policy.submission_enabled ? 'enabled' : 'disabled'}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">spend ceiling</dt>
                <dd className="metric text-text-primary">${probe.policy.spend_ceiling_usd}</dd>
              </div>
              <div className="col-span-2 sm:col-span-4 text-text-muted">
                {probe.policy.plan_policy.replace(/_/g, ' ')} · credentials{' '}
                {probe.policy.credential_model.replace(/_/g, '-')} · max{' '}
                {probe.policy.max_shots.toLocaleString()} shots · jobs{' '}
                {probe.policy.job_durability.replace(/_/g, '-')}
              </div>
            </dl>
          )}
          {probe.state === 'error' && (
            <p className="mt-3 rounded-control border border-state-critical/30 bg-bg-base p-3 text-caption text-text-secondary">
              <span className="metric text-state-critical">{probe.code}</span> — {probe.message}
            </p>
          )}
        </div>

        {/* --------------------------------------------------------- credential */}
        <div className="border-b border-border-hairline p-4">
          <div className="flex items-center gap-1.5 text-body-s font-medium text-text-primary">
            <KeyRound size={14} className="text-series-mitigated" aria-hidden /> IBM Quantum token
          </div>
          <p className="mt-1 text-caption text-text-muted">
            Your own token, held in this tab&rsquo;s memory only — never written to storage, never
            sent anywhere except as a header to the backend above. Closing the tab discards it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={tokenHeld ? '•••••••• held in memory' : 'paste your IBM Quantum token'}
              autoComplete="off"
              spellCheck={false}
              aria-label="IBM Quantum API token"
              className="mono min-w-0 flex-1 rounded-control border border-border-control bg-bg-base px-3 py-2 text-body-s text-text-primary placeholder:text-text-muted"
            />
            <button
              onClick={() => {
                setToken(token);
                setTokenHeld(true);
                setTokenInput('');
              }}
              disabled={!token.trim()}
              className="rounded-control border border-border-control px-3 py-2 text-body-s text-text-secondary hover:bg-row-hover disabled:opacity-50"
            >
              Hold
            </button>
            <button
              onClick={() => {
                clearToken();
                setTokenHeld(false);
                setTokenInput('');
              }}
              disabled={!tokenHeld}
              className="rounded-control border border-border-control px-3 py-2 text-body-s text-text-secondary hover:bg-row-hover disabled:opacity-50"
            >
              Forget
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-caption text-text-muted">
            <ShieldCheck size={13} className="text-state-healthy" aria-hidden />
            {tokenHeld ? 'A token is held for this tab.' : 'No token held.'} Nothing is persisted to
            disk.
          </p>
        </div>

        {/* ------------------------------------------------------------ display */}
        <div className="flex items-center justify-between border-b border-border-hairline p-4">
          <div>
            <div className="text-body-s font-medium text-text-primary">Theme</div>
            <div className="text-caption text-text-muted">
              Dark-first; both themes are hand-authored and contrast-checked.
            </div>
          </div>
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-control border border-border-control px-3 py-1.5 text-body-s text-text-secondary hover:bg-row-hover"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}{' '}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <div className="flex items-center gap-1.5 text-body-s font-medium text-text-primary">
              <Database size={14} className="text-series-mitigated" aria-hidden /> Data source
            </div>
            <div className="text-caption text-text-muted">
              Without a backend, every figure is computed here from seeded demo devices — no
              account, no secrets, no server calls.
            </div>
          </div>
          <span className="shrink-0 rounded-chip border border-border-hairline px-2 py-0.5 text-caption text-text-muted">
            {probe.state === 'ok' ? 'Backend' : 'Demo Data'}
          </span>
        </div>
      </Card>
    </div>
  );
}
