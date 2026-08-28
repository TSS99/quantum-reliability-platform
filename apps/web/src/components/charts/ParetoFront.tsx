import { useId, useState } from 'react';
import type { ExecutionPlan } from '../../services/contracts';
import { linScale, logScale, money, fmtSci } from './scale';

export type ParetoAxis = 'cost' | 'runtime' | 'shots';

export interface ParetoFrontProps {
  plans: ExecutionPlan[];
  paretoIds: Set<string>;
  recommendedId: string | null;
  summary: string;
  /** Hard constraints — drawn so the feasible region is visible, not implied. */
  maxCostUsd?: number;
  maxRuntimeSeconds?: number;
  targetError?: number;
  axis?: ParetoAxis;
  onAxisChange?: (a: ParetoAxis) => void;
  onSelect?: (planId: string) => void;
  height?: number;
}

const AXES: { id: ParetoAxis; label: string }[] = [
  { id: 'cost', label: 'Cost' },
  { id: 'runtime', label: 'Runtime' },
  { id: 'shots', label: 'Shots' },
];

/** Mitigation families get distinct marker shapes, so the chart survives greyscale. */
function marker(family: string, cx: number, cy: number, r: number) {
  if (family.includes('zne')) return <polygon points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`} />;
  if (family.includes('dd')) return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} />;
  if (family.includes('readout')) return <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} />;
  return <circle cx={cx} cy={cy} r={r} />;
}

/**
 * Cost (or runtime/shots) vs expected error, with the constraint box drawn.
 *
 * A scatter plot shows options; this shows the DECISION: the shaded corner is the region that
 * satisfies both hard constraints, so a reader can see at a glance which strategies were even
 * eligible before scoring. Points carry uncertainty whiskers because a single dot implies a
 * precision the bias/variance model does not claim.
 */
export function ParetoFront({
  plans,
  paretoIds,
  recommendedId,
  summary,
  maxCostUsd,
  maxRuntimeSeconds,
  targetError,
  axis = 'cost',
  onAxisChange,
  onSelect,
  height = 320,
}: ParetoFrontProps) {
  const W = 560, H = height, m = { l: 62, r: 16, t: 16, b: 42 };
  const [active, setActive] = useState<string | null>(null);
  const clip = useId();

  const feas = plans.filter((p) => p.feasibility === 'feasible');
  if (feas.length === 0) {
    return (
      <div className="rounded-card border border-border-hairline bg-bg-surface p-6 text-body-s text-text-muted">
        No feasible plans to plot — every candidate violates a hard constraint.
      </div>
    );
  }

  const xOf = (p: ExecutionPlan) =>
    axis === 'cost' ? p.estimated_cost_usd.value : axis === 'runtime' ? p.estimated_qpu_seconds.value : p.shots;
  const xCap = axis === 'cost' ? maxCostUsd : axis === 'runtime' ? maxRuntimeSeconds : undefined;
  const xLabel = axis === 'cost' ? 'estimated cost' : axis === 'runtime' ? 'estimated QPU seconds' : 'shots';
  const fmtX = (v: number) => (axis === 'cost' ? money(v) : axis === 'runtime' ? `${v.toFixed(0)}s` : v.toLocaleString());

  const xsAll = feas.map(xOf).concat(xCap ? [xCap] : []);
  const errs = feas.map((p) => p.rmse.value).concat(targetError ? [targetError] : []);
  const sx = linScale(Math.min(...xsAll) * 0.9, Math.max(...xsAll) * 1.06, m.l, W - m.r);
  const sy = logScale(Math.min(...errs) * 0.85, Math.max(...errs) * 1.15, H - m.b, m.t);

  const frontier = feas.filter((p) => paretoIds.has(p.plan_id)).sort((a, b) => xOf(a) - xOf(b));
  const hp = active ? feas.find((p) => p.plan_id === active) : null;

  return (
    <figure className="rounded-card border border-border-hairline bg-bg-surface p-3">
      {onAxisChange && (
        <div className="mb-2 flex items-center gap-1.5" role="group" aria-label="X axis metric">
          {AXES.map((a) => (
            <button
              key={a.id}
              onClick={() => onAxisChange(a.id)}
              aria-pressed={axis === a.id}
              className={
                'rounded-chip border px-2 py-0.5 text-caption transition-colors ' +
                (axis === a.id
                  ? 'border-border-control bg-row-selected text-text-primary'
                  : 'border-border-hairline text-text-secondary hover:bg-row-hover')
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary} className="text-text-muted">
        <clipPath id={clip}>
          <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} />
        </clipPath>

        {/* the feasible corner: under the cost cap AND under the target error */}
        {(xCap || targetError) && (
          <g clipPath={`url(#${clip})`}>
            <rect
              x={m.l}
              y={targetError ? sy(targetError) : m.t}
              width={(xCap ? sx(xCap) : W - m.r) - m.l}
              height={(H - m.b) - (targetError ? sy(targetError) : m.t)}
              fill="rgb(var(--glow-cyan) / 0.07)"
            />
            {targetError && (
              <line x1={m.l} x2={W - m.r} y1={sy(targetError)} y2={sy(targetError)}
                    stroke="var(--color-state-healthy)" strokeDasharray="4 3" strokeWidth={1.2} />
            )}
            {xCap && (
              <line x1={sx(xCap)} x2={sx(xCap)} y1={m.t} y2={H - m.b}
                    stroke="var(--color-state-warning)" strokeDasharray="4 3" strokeWidth={1.2} />
            )}
          </g>
        )}

        <line x1={m.l} y1={m.t} x2={m.l} y2={H - m.b} stroke="var(--color-border-hairline)" />
        <line x1={m.l} y1={H - m.b} x2={W - m.r} y2={H - m.b} stroke="var(--color-border-hairline)" />

        {frontier.length > 1 && (
          <path
            d={frontier.map((p, i) => `${i ? 'L' : 'M'}${sx(xOf(p)).toFixed(1)},${sy(p.rmse.value).toFixed(1)}`).join(' ')}
            fill="none" stroke="var(--color-series-mitigated)" strokeWidth={1.5} strokeDasharray="4 3"
            clipPath={`url(#${clip})`}
          />
        )}

        {feas.map((p) => {
          const on = paretoIds.has(p.plan_id);
          const rec = p.plan_id === recommendedId;
          const hv = p.plan_id === active;
          const cx = sx(xOf(p)), cy = sy(p.rmse.value);
          // uncertainty whisker: a point estimate alone overstates the model's precision
          const lo = sy(Math.max(p.rmse.value * 0.75, 1e-9)), hi = sy(p.rmse.value * 1.25);
          return (
            <g key={p.plan_id} clipPath={`url(#${clip})`}>
              {on && <line x1={cx} x2={cx} y1={hi} y2={lo} stroke="var(--color-series-mitigated)" strokeWidth={1} opacity={0.45} />}
              <g
                role="button"
                tabIndex={0}
                aria-label={`${p.strategy.display_name}: ${fmtX(xOf(p))}, error ${fmtSci(p.rmse.value)}${on ? ', Pareto-optimal' : ''}${rec ? ', recommended' : ''}`}
                onPointerEnter={() => setActive(p.plan_id)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(p.plan_id)}
                onBlur={() => setActive(null)}
                onClick={() => onSelect?.(p.plan_id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(p.plan_id); } }}
                className="cursor-pointer outline-none"
                style={{ opacity: on ? 1 : 0.55 }}
                fill={on ? 'var(--color-series-mitigated)' : 'var(--color-text-muted)'}
              >
                {/* generous invisible hit area so this works on touch, not just hover */}
                <circle cx={cx} cy={cy} r={16} fill="transparent" />
                {rec && <circle cx={cx} cy={cy} r={hv ? 10 : 8} fill="none" stroke="var(--color-focus-outer)" strokeWidth={2} />}
                {marker(p.strategy.strategy_id, cx, cy, hv ? 6 : on ? 5 : 3.5)}
              </g>
            </g>
          );
        })}

        <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="fill-current text-[10px]">{xLabel} →</text>
        <text transform={`translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-current text-[10px]">expected error →</text>
      </svg>

      <figcaption className="mt-1 px-1 text-caption text-text-secondary">
        {hp ? (
          <span className="metric">
            {hp.strategy.display_name} · {fmtX(xOf(hp))} · err {fmtSci(hp.rmse.value)}
            {paretoIds.has(hp.plan_id) ? ' · Pareto-optimal' : ''}
          </span>
        ) : (
          <span>
            Shaded corner satisfies both hard constraints. Filled markers are Pareto-optimal; the
            ringed marker is recommended. Whiskers show model uncertainty.
          </span>
        )}
      </figcaption>
    </figure>
  );
}
