import { useState } from 'react';
import type { HardwareProfile } from '../../services/contracts';
import { linScale, fmtSci } from './scale';

export type QubitMetric = 'readout' | 't1' | 't2';

export interface CouplingMapProps {
  profile: HardwareProfile;
  summary: string;
  size?: number;
  /** Show the metric selector + coupler legend. Off for the small dashboard tiles. */
  detailed?: boolean;
  metric?: QubitMetric;
  onMetricChange?: (m: QubitMetric) => void;
}

/**
 * ABSOLUTE thresholds, deliberately.
 *
 * The previous version coloured each device against its own min/max, so the worst qubit on an
 * excellent machine looked as red as the worst qubit on a bad one — the colours could not be
 * compared across hardware, which is the entire point of a hardware comparison. These are fixed
 * bands (documented, configurable), so green means the same thing everywhere.
 */
const QUBIT_BANDS: Record<QubitMetric, { label: string; unit: string; good: number; warn: number; higherIsBetter: boolean }> = {
  readout: { label: 'Readout error', unit: '', good: 0.01, warn: 0.03, higherIsBetter: false },
  t1: { label: 'T1', unit: 'µs', good: 100, warn: 50, higherIsBetter: true },
  t2: { label: 'T2', unit: 'µs', good: 80, warn: 40, higherIsBetter: true },
};

/** Two-qubit gate error bands — the dominant error source in most circuits. */
const COUPLER_BANDS = { good: 0.006, warn: 0.012 };

const HEALTHY = 'var(--color-state-healthy)';
const WARNING = 'var(--color-state-warning)';
const CRITICAL = 'var(--color-state-critical)';

function band(value: number | null, good: number, warn: number, higherIsBetter: boolean) {
  if (value == null) return 'var(--color-state-uncertain)';
  if (higherIsBetter) return value >= good ? HEALTHY : value >= warn ? WARNING : CRITICAL;
  return value <= good ? HEALTHY : value <= warn ? WARNING : CRITICAL;
}

export function CouplingMap({ profile, summary, size = 180, detailed = false, metric, onMetricChange }: CouplingMapProps) {
  const [local, setLocal] = useState<QubitMetric>('readout');
  const active = metric ?? local;
  const setActive = onMetricChange ?? setLocal;
  const [hover, setHover] = useState<string | null>(null);

  const P = detailed ? 26 : 14;
  const S = size;
  const xs = profile.qubits.map((q) => q.lattice_x);
  const ys = profile.qubits.map((q) => q.lattice_y);
  const sx = linScale(Math.min(...xs), Math.max(...xs), P, S - P);
  const sy = linScale(Math.min(...ys), Math.max(...ys), P, S - P);
  const cfg = QUBIT_BANDS[active];

  const valueOf = (q: (typeof profile.qubits)[number]) =>
    active === 'readout' ? q.readout_error_rate.value : active === 't1' ? (q.t1_us?.value ?? null) : (q.t2_us?.value ?? null);

  // The worst coupler is what actually limits an entangling circuit — surface it.
  const worst = [...profile.coupling_map].sort(
    (a, b) => b.two_qubit_error_rate.value - a.two_qubit_error_rate.value,
  )[0];

  return (
    <div className="flex flex-col gap-2">
      {detailed && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Qubit metric">
          {(Object.keys(QUBIT_BANDS) as QubitMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setActive(m)}
              aria-pressed={active === m}
              className={
                'rounded-chip border px-2 py-0.5 text-caption transition-colors ' +
                (active === m
                  ? 'border-border-control bg-row-selected text-text-primary'
                  : 'border-border-hairline text-text-secondary hover:bg-row-hover')
              }
            >
              {QUBIT_BANDS[m].label}
            </button>
          ))}
        </div>
      )}

      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} role="img" aria-label={summary} className="text-border-control">
        {profile.coupling_map.map((e, i) => {
          const a = profile.qubits.find((q) => q.qubit === e.control);
          const b = profile.qubits.find((q) => q.qubit === e.target);
          if (!a || !b) return null;
          const err = e.two_qubit_error_rate.value;
          const col = band(err, COUPLER_BANDS.good, COUPLER_BANDS.warn, false);
          const id = `${e.control}-${e.target}`;
          return (
            <g key={id}>
              <line
                x1={sx(a.lattice_x)} y1={sy(a.lattice_y)} x2={sx(b.lattice_x)} y2={sy(b.lattice_y)}
                stroke={detailed ? col : 'currentColor'}
                strokeWidth={detailed ? (hover === id ? 4 : 2.4) : 1.5}
                strokeLinecap="round"
                opacity={detailed ? 0.85 : 1}
                onPointerEnter={() => detailed && setHover(id)}
                onPointerLeave={() => detailed && setHover(null)}
              />
            </g>
          );
        })}
        {profile.qubits.map((q) => {
          const v = valueOf(q);
          return (
            <circle
              key={q.qubit}
              cx={sx(q.lattice_x)}
              cy={sy(q.lattice_y)}
              r={detailed ? 7 : 5}
              fill={band(v, cfg.good, cfg.warn, cfg.higherIsBetter)}
              stroke="var(--color-bg-surface)"
              strokeWidth={1.5}
            >
              <title>{`q${q.qubit} · ${cfg.label} ${v == null ? 'Not provided' : fmtSci(v) + cfg.unit}`}</title>
            </circle>
          );
        })}
      </svg>

      {detailed && (
        <div className="flex flex-col gap-1.5 text-caption">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: HEALTHY }} /> good</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: WARNING }} /> watch</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CRITICAL }} /> poor</span>
            <span className="text-text-muted">
              absolute bands — comparable across devices
            </span>
          </div>
          {worst && (
            <div className="text-text-muted">
              Worst coupler{' '}
              <span className="metric text-text-secondary">
                q{worst.control}↔q{worst.target} {fmtSci(worst.two_qubit_error_rate.value)}
              </span>{' '}
              · median{' '}
              <span className="metric text-text-secondary">{fmtSci(profile.median_two_qubit_error_rate.value)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
