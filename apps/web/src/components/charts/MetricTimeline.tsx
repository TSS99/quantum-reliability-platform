import { linScale } from './scale';

export interface TimelinePoint {
  t: string; // ISO timestamp
  v: number;
}

export interface MetricTimelineProps {
  points: TimelinePoint[];
  summary: string;
  /** CSS colour token for the trace, e.g. 'var(--color-series-mitigated)'. */
  color?: string;
  height?: number;
  format?: (v: number) => string;
}

// A compact drift sparkline: one metric over its calibration history, newest at the right.
export function MetricTimeline({
  points,
  summary,
  color = 'var(--color-series-mitigated)',
  height = 64,
  format = (v) => v.toPrecision(3),
}: MetricTimelineProps) {
  const W = 320,
    H = height,
    m = { l: 4, r: 4, t: 8, b: 8 };
  if (points.length < 2) return null;
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs),
    hi = Math.max(...vs);
  const sx = linScale(0, points.length - 1, m.l, W - m.r);
  const sy = linScale(lo, hi, H - m.b, m.t);
  const d = points.map((p, i) => (i ? 'L' : 'M') + sx(i).toFixed(1) + ',' + sy(p.v).toFixed(1)).join(' ');
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const rising = last.v > first.v;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={summary} preserveAspectRatio="none">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        vectorEffect="non-scaling-stroke"
        style={{ animation: 'qrp-draw .8s ease both' }}
      />
      <circle cx={sx(points.length - 1)} cy={sy(last.v)} r={2.5} fill={color} />
      <text
        x={W - m.r}
        y={sy(last.v) + (rising ? 14 : -6)}
        textAnchor="end"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}
        fill="var(--color-text-secondary)"
      >
        {format(last.v)}
      </text>
    </svg>
  );
}
