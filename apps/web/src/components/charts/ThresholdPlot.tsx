import { useId } from 'react';
import type { ThresholdCurve } from '../../services/qecGrid';
import { logScale, decades, fmtSci } from './scale';

const SERIES = ['var(--color-series-mitigated)', 'var(--color-series-logical)', 'var(--color-state-warning)'];

export interface ThresholdPlotProps {
  curves: ThresholdCurve[];
  /** a11y — required (design_tokens): a text description of what the plot shows. */
  summary: string;
  height?: number;
}

// Logical vs physical error, log-log, one curve per code distance. The curves CROSS — below the
// crossing, more distance helps (error correction working); above it, more distance hurts. Data is
// the real committed grid (demo-data/qec). Simulated — labelled by the caller.
export function ThresholdPlot({ curves, summary, height = 320 }: ThresholdPlotProps) {
  const W = 640, H = height, m = { l: 62, r: 16, t: 16, b: 40 };
  const pts = curves.flatMap((c) => c.rows);
  const clip = useId();
  if (pts.length === 0) {
    return <div className="rounded-card border border-border-hairline bg-bg-surface p-6 text-body-s text-text-muted">No data on the grid for this selection.</div>;
  }
  const floor = 5e-5;
  const xs = pts.map((r) => r.p), ys = pts.map((r) => Math.max(r.logical_error_rate, floor));
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys, floor), ymax = Math.max(...ys, xmax);
  const sx = logScale(xmin, xmax, m.l, W - m.r);
  const sy = logScale(ymin, ymax, H - m.b, m.t);
  const xTicks = decades(xmin, xmax), yTicks = decades(ymin, ymax);

  return (
    <figure className="rounded-card border border-border-hairline bg-bg-surface p-3">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary} className="text-text-muted">
        <clipPath id={clip}><rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} /></clipPath>
        {yTicks.map((t) => (
          <g key={'y' + t}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="var(--color-rail-graticule)" />
            <text x={m.l - 8} y={sy(t) + 3} textAnchor="end" className="fill-current text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>{fmtSci(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={'x' + t}>
            <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="var(--color-rail-graticule)" />
            <text x={sx(t)} y={H - m.b + 16} textAnchor="middle" className="fill-current text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>{fmtSci(t)}</text>
          </g>
        ))}
        {/* y = x reference: the break-even where mitigation neither helps nor hurts */}
        <line x1={sx(xmin)} y1={sy(xmin)} x2={sx(xmax)} y2={sy(xmax)} stroke="var(--color-border-control)" strokeDasharray="3 3" clipPath={`url(#${clip})`} />
        {curves.map((c, i) => {
          const rows = c.rows.filter((r) => r.logical_error_rate > 0 || true);
          const d = rows.map((r, j) => `${j ? 'L' : 'M'}${sx(r.p).toFixed(1)},${sy(Math.max(r.logical_error_rate, floor)).toFixed(1)}`).join(' ');
          const col = SERIES[i % SERIES.length];
          return (
            <g key={c.distance} clipPath={`url(#${clip})`}>
              <path d={d} fill="none" stroke={col} strokeWidth={2} strokeLinejoin="round"
                    style={{ strokeDasharray: 1200, strokeDashoffset: 0, animation: 'qrp-draw .9s var(--ease-standard, ease) both' }} />
              {rows.map((r) => (
                <circle key={r.p} cx={sx(r.p)} cy={sy(Math.max(r.logical_error_rate, floor))} r={2.5} fill={col} />
              ))}
            </g>
          );
        })}
        <text x={m.l} y={H - 4} className="fill-current text-[10px]">physical error rate p</text>
        <text transform={`translate(14 ${m.t + 8}) rotate(0)`} className="fill-current text-[10px]">logical error</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 px-1 text-caption text-text-secondary">
        {curves.map((c, i) => (
          <span key={c.distance} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            d = {c.distance} <span className="text-text-muted">({c.physical_qubits} qubits)</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
