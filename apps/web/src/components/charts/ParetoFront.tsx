import { useId, useState } from 'react';
import type { ExecutionPlan } from '../../services/contracts';
import { linScale, logScale, money, fmtSci } from './scale';

export interface ParetoFrontProps {
  plans: ExecutionPlan[];
  paretoIds: Set<string>;
  recommendedId: string | null;
  summary: string;
  onSelect?: (planId: string) => void;
  height?: number;
}

// Cost (x) vs expected error (y). The Pareto-efficient plans form the frontier a buyer actually
// chooses between; everything up-and-right of them is dominated. Recommended plan is ringed.
export function ParetoFront({ plans, paretoIds, recommendedId, summary, onSelect, height = 300 }: ParetoFrontProps) {
  const W = 560, H = height, m = { l: 58, r: 14, t: 14, b: 38 };
  const [hover, setHover] = useState<string | null>(null);
  const feas = plans.filter((p) => p.feasibility === 'feasible');
  if (feas.length === 0) return <div className="rounded-card border border-border-hairline bg-bg-surface p-6 text-body-s text-text-muted">No feasible plans to plot.</div>;
  const costs = feas.map((p) => p.estimated_cost_usd.value), errs = feas.map((p) => p.rmse.value);
  const sx = linScale(Math.min(...costs) * 0.9, Math.max(...costs) * 1.05, m.l, W - m.r);
  const sy = logScale(Math.min(...errs) * 0.9, Math.max(...errs) * 1.1, H - m.b, m.t);
  const frontier = feas.filter((p) => paretoIds.has(p.plan_id)).sort((a, b) => a.estimated_cost_usd.value - b.estimated_cost_usd.value);
  const hp = hover ? feas.find((p) => p.plan_id === hover) : null;

  return (
    <figure className="rounded-card border border-border-hairline bg-bg-surface p-3">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary} className="text-text-muted">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const x = m.l + f * (W - m.l - m.r);
          return <line key={f} x1={x} x2={x} y1={m.t} y2={H - m.b} stroke="var(--color-rail-graticule)" />;
        })}
        <line x1={m.l} y1={m.t} x2={m.l} y2={H - m.b} stroke="var(--color-border-hairline)" />
        <line x1={m.l} y1={H - m.b} x2={W - m.r} y2={H - m.b} stroke="var(--color-border-hairline)" />
        {/* frontier line */}
        {frontier.length > 1 && (
          <path d={frontier.map((p, i) => `${i ? 'L' : 'M'}${sx(p.estimated_cost_usd.value).toFixed(1)},${sy(p.rmse.value).toFixed(1)}`).join(' ')}
                fill="none" stroke="var(--color-series-mitigated)" strokeWidth={1.5} strokeDasharray="4 3" />
        )}
        {feas.map((p) => {
          const on = paretoIds.has(p.plan_id), rec = p.plan_id === recommendedId, hv = p.plan_id === hover;
          return (
            <circle key={p.plan_id} cx={sx(p.estimated_cost_usd.value)} cy={sy(p.rmse.value)} r={hv ? 7 : rec ? 6 : on ? 5 : 3.5}
              fill={on ? 'var(--color-series-mitigated)' : 'var(--color-text-muted)'}
              stroke={rec ? 'var(--color-focus-outer)' : 'transparent'} strokeWidth={rec ? 2 : 0}
              className="cursor-pointer transition-all" style={{ opacity: on ? 1 : 0.5 }}
              onMouseEnter={() => setHover(p.plan_id)} onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(p.plan_id)} />
          );
        })}
        <text x={(m.l + W - m.r) / 2} y={H - 4} textAnchor="middle" className="fill-current text-[10px]">estimated cost →</text>
        <text transform={`translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-current text-[10px]">expected error →</text>
      </svg>
      <figcaption className="mt-1 px-1 text-caption text-text-secondary">
        {hp ? (
          <span className="metric">{hp.strategy.display_name} · {money(hp.estimated_cost_usd.value)} · err {fmtSci(hp.rmse.value)}{paretoIds.has(hp.plan_id) ? ' · Pareto-optimal' : ''}</span>
        ) : (
          <span>Filled dots are Pareto-optimal; the ringed dot is recommended. Hover a point for detail.</span>
        )}
      </figcaption>
    </figure>
  );
}
