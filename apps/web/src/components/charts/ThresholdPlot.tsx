import { useId } from 'react';
import type { ThresholdCurve } from '../../services/qecGrid';
import { logScale, decades, fmtSci } from './scale';
import { DrawPath } from '../fx';

const SERIES = ['var(--color-series-mitigated)', 'var(--color-series-logical)', 'var(--color-state-warning)'];

export interface ThresholdPlotProps {
  curves: ThresholdCurve[];
  /** a11y — required: a text description of what the plot shows. */
  summary: string;
  height?: number;
}

/** Below this the y-axis stops; points at or under it are drawn as upper bounds, not values. */
const FLOOR = 1e-5;

interface Pt {
  p: number;
  /** Per-round logical error rate — the quantity a threshold comparison is defined on. */
  value: number | null;
  lo: number;
  hi: number;
  /** No failures observed: `hi` is a statistical UPPER BOUND, not a measurement. */
  bound: boolean;
  insufficient: boolean;
  shots: number;
  errors: number;
}

/**
 * Logical vs physical error, log-log, one curve per code distance.
 *
 * Three things this plot is careful about, because getting them wrong misleads a reader:
 *  1. It plots the PER-ROUND rate (QEC_METHODS.md). Rounds scale with distance, so comparing raw
 *     logical error across distances compares experiments of different lengths.
 *  2. Wilson intervals are drawn as a band. The data has always carried them; hiding them implies
 *     a precision the shot count does not support.
 *  3. Zero observed failures are drawn as a downward upper-bound marker at the Wilson upper limit —
 *     never as a point on an arbitrary floor, which would turn "we saw nothing" into "we measured this".
 */
export function ThresholdPlot({ curves, summary, height = 340 }: ThresholdPlotProps) {
  const W = 640, H = height, m = { l: 66, r: 16, t: 16, b: 44 };
  const clip = useId();

  const series = curves.map((c) => ({
    distance: c.distance,
    physical_qubits: c.physical_qubits,
    pts: c.rows.map<Pt>((r) => {
      const bound = r.logical_errors === 0;
      const value = r.per_round_null_reason ? null : r.logical_error_rate_per_round;
      return {
        p: r.p,
        value: bound ? null : value,
        lo: Math.max(r.lerpr_ci_low ?? 0, FLOOR),
        hi: Math.max(r.lerpr_ci_high ?? value ?? FLOOR, FLOOR),
        bound,
        insufficient: r.insufficient_statistics,
        shots: r.shots,
        errors: r.logical_errors,
      };
    }),
  }));

  const all = series.flatMap((s) => s.pts);
  if (all.length === 0) {
    return (
      <div className="rounded-card border border-border-hairline bg-bg-surface p-6 text-body-s text-text-muted">
        No data on the grid for this selection.
      </div>
    );
  }

  const xs = all.map((d) => d.p);
  const ysRaw = all.flatMap((d) => [d.value, d.lo, d.hi].filter((v): v is number => v != null && v > 0));
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.max(Math.min(...ysRaw), FLOOR), ymax = Math.max(...ysRaw);
  const sx = logScale(xmin, xmax, m.l, W - m.r);
  const sy = logScale(ymin, ymax, H - m.b, m.t);
  const xTicks = decades(xmin, xmax), yTicks = decades(ymin, ymax);

  return (
    <figure className="rounded-card border border-border-hairline bg-bg-surface p-3">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary} className="text-text-muted">
        <clipPath id={clip}>
          <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} />
        </clipPath>

        {yTicks.map((t) => (
          <g key={'y' + t}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="var(--color-rail-graticule)" />
            <text x={m.l - 8} y={sy(t) + 3} textAnchor="end" className="fill-current text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
              {fmtSci(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={'x' + t}>
            <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="var(--color-rail-graticule)" />
            <text x={sx(t)} y={H - m.b + 16} textAnchor="middle" className="fill-current text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
              {fmtSci(t)}
            </text>
          </g>
        ))}

        {series.map((s, i) => {
          const col = SERIES[i % SERIES.length]!;
          const solid = s.pts.filter((d) => d.value != null);
          const line = solid
            .map((d, j) => `${j ? 'L' : 'M'}${sx(d.p).toFixed(1)},${sy(d.value!).toFixed(1)}`)
            .join(' ');
          // Wilson band: upper edge forward, lower edge back.
          const band =
            solid.length > 1
              ? solid.map((d, j) => `${j ? 'L' : 'M'}${sx(d.p).toFixed(1)},${sy(d.hi).toFixed(1)}`).join(' ') +
                ' ' +
                [...solid].reverse().map((d) => `L${sx(d.p).toFixed(1)},${sy(d.lo).toFixed(1)}`).join(' ') +
                ' Z'
              : '';
          return (
            <g key={s.distance} clipPath={`url(#${clip})`}>
              {band && <path d={band} fill={col} opacity={0.13} />}
              {/* Was a CSS keyframe, which runs regardless of the user's reduced-motion setting.
                  DrawPath honours it and finishes in the same static state. Distances draw in
                  order so the curves separate visibly rather than appearing at once. */}
              <DrawPath
                d={line}
                duration={0.95}
                delay={i * 0.16}
                fill="none"
                stroke={col}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {s.pts.map((d) =>
                d.bound ? (
                  // zero observed failures: a 95% upper bound, drawn as a bound marker
                  <g key={'b' + d.p} stroke={col} fill={col}>
                    <line x1={sx(d.p)} y1={sy(d.hi)} x2={sx(d.p)} y2={sy(d.hi) + 14} strokeWidth={1.5} />
                    <path d={`M${sx(d.p) - 4},${sy(d.hi) + 12} L${sx(d.p) + 4},${sy(d.hi) + 12} L${sx(d.p)},${sy(d.hi) + 19} Z`} />
                    <circle cx={sx(d.p)} cy={sy(d.hi)} r={2.5} fill="none" strokeWidth={1.5} />
                  </g>
                ) : d.value != null ? (
                  <circle
                    key={'v' + d.p}
                    cx={sx(d.p)}
                    cy={sy(d.value)}
                    r={d.insufficient ? 2 : 3}
                    fill={d.insufficient ? 'none' : col}
                    stroke={col}
                    strokeWidth={d.insufficient ? 1.5 : 0}
                  />
                ) : null,
              )}
            </g>
          );
        })}

        <text x={m.l} y={H - 6} className="fill-current text-[10px]">physical error rate p</text>
        <text x={14} y={m.t + 8} className="fill-current text-[10px]">logical error / round</text>
      </svg>

      <figcaption className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-caption text-text-secondary">
        {series.map((s, i) => (
          <span key={s.distance} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            d = {s.distance} <span className="text-text-muted">({s.physical_qubits} qubits)</span>
          </span>
        ))}
        <span className="text-text-muted">shaded = 95% Wilson interval</span>
        <span className="text-text-muted">▽ = upper bound (0 failures observed)</span>
        <span className="text-text-muted">○ = insufficient statistics</span>
      </figcaption>
    </figure>
  );
}
