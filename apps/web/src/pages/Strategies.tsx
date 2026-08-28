import { Card } from '../components/ui';
import { STRATEGY_CATALOG } from '../services/demoFixtures';
import type { Maturity } from '../services/contracts';

const MATURITY: Record<Maturity, { label: string; cls: string }> = {
  implemented: { label: 'Implemented', cls: 'text-state-healthy bg-state-healthy-bg' },
  experimental: { label: 'Experimental', cls: 'text-state-warning bg-state-warning-bg' },
  planned: { label: 'Planned', cls: 'text-state-uncertain bg-state-uncertain-bg' },
};

export function Strategies() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow uppercase text-series-mitigated">Strategies</p>
        <h2 className="font-display text-display-m font-normal">Error-management technique catalog</h2>
        <p className="mt-1 max-w-2xl text-body-s text-text-muted">
          Every technique the optimizer can offer, with its honest cost. Sampling overhead is a
          shot multiplier (≥ 1) — mitigation buys accuracy with more measurements, never fewer.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STRATEGY_CATALOG.map((s) => {
          const m = MATURITY[s.maturity];
          const params = Object.entries(s.parameters);
          return (
            <Card key={s.strategy_id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-heading-m text-text-primary">{s.display_name}</h3>
                <span className={'shrink-0 rounded-chip px-1.5 py-0.5 text-caption ' + m.cls}>{m.label}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-caption text-text-muted">
                <span className="rounded-chip border border-border-hairline px-1.5 py-0.5">{s.family.replace(/_/g, ' ')}</span>
                {!s.executable && <span className="rounded-chip border border-border-hairline px-1.5 py-0.5 text-state-uncertain">calculator only</span>}
                {s.twirling_enabled && <span className="rounded-chip border border-border-hairline px-1.5 py-0.5">twirled</span>}
              </div>
              <p className="text-body-s text-text-secondary">{s.description}</p>
              <div className="mt-auto flex items-center justify-between border-t border-border-hairline pt-2 text-body-s">
                <span className="text-text-muted">sampling overhead</span>
                <span className="metric text-text-primary">{s.sampling_overhead.value.toFixed(2)}×</span>
              </div>
              {params.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-caption">
                  {params.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-text-muted">{k}</dt>
                      <dd className="metric text-text-secondary">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
