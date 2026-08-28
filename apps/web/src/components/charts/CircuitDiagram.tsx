import type { CircuitOp } from '../../services/qasm';

export interface CircuitDiagramProps {
  ops: CircuitOp[];
  qubitCount: number;
  /** Set when the parser stopped emitting ops — the picture is then a prefix, and must say so. */
  truncated?: boolean;
  /** Compact strips the wire labels and shrinks the grid, for use inside a list card. */
  compact?: boolean;
  title?: string;
}

/**
 * A circuit diagram drawn from the parser's own op stream.
 *
 * It shares `parseQasm` with the optimizer rather than reading a second, prettier description of
 * the circuit, so the picture cannot drift from the thing being costed. If the diagram is wrong,
 * the analysis was wrong too — which is the useful property.
 *
 * Columns are assigned greedily: an op takes the first column free across every wire it spans,
 * including the wires a two-qubit gate reaches over. That is a layout, not a schedule, and it is
 * NOT where `depth` comes from — depth stays the parser's own estimate, and this never claims
 * otherwise.
 */
export function CircuitDiagram({ ops, qubitCount, truncated, compact, title }: CircuitDiagramProps) {
  if (!ops.length || qubitCount < 1) return null;

  const rowH = compact ? 20 : 28;
  const colW = compact ? 22 : 30;
  const padL = compact ? 8 : 34;
  const padR = 10;
  const padY = compact ? 8 : 14;

  // Greedy column packing.
  const nextFree = new Array<number>(qubitCount).fill(0);
  const placed = ops.map((op) => {
    const lo = Math.min(...op.qubits);
    const hi = Math.max(...op.qubits);
    let col = 0;
    for (let w = lo; w <= hi; w++) col = Math.max(col, nextFree[w] ?? 0);
    for (let w = lo; w <= hi; w++) nextFree[w] = col + 1;
    return { op, col, lo, hi };
  });

  const cols = Math.max(...placed.map((p) => p.col)) + 1;
  const W = padL + cols * colW + padR;
  const H = padY * 2 + (qubitCount - 1) * rowH + (compact ? 12 : 18);

  const x = (col: number) => padL + col * colW + colW / 2;
  const y = (wire: number) => padY + wire * rowH + (compact ? 4 : 6);

  const label = title ?? `Circuit diagram: ${qubitCount} qubits, ${ops.length} operations.`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={label}
        className="max-w-none text-text-muted"
      >
        {/* wires */}
        {Array.from({ length: qubitCount }, (_, w) => (
          <g key={w}>
            {!compact && (
              <text x={4} y={y(w) + 3.5} className="metric fill-current text-[10px]">
                q{w}
              </text>
            )}
            <line
              x1={padL - 4}
              y1={y(w)}
              x2={W - padR}
              y2={y(w)}
              stroke="var(--color-border-control)"
              strokeWidth={1}
            />
          </g>
        ))}

        {placed.map(({ op, col, lo, hi }, i) => {
          const cx = x(col);
          if (op.kind === '2q' || op.kind === 'nq') {
            const isCx = op.name === 'cx' || op.name === 'cz';
            const ctrl = op.qubits[0] ?? lo;
            const targ = op.qubits[op.qubits.length - 1] ?? hi;
            return (
              <g key={i} stroke="var(--color-series-mitigated)" fill="var(--color-series-mitigated)">
                <line x1={cx} y1={y(lo)} x2={cx} y2={y(hi)} strokeWidth={1.3} />
                <circle cx={cx} cy={y(ctrl)} r={compact ? 2.6 : 3.4} />
                {isCx ? (
                  <>
                    <circle cx={cx} cy={y(targ)} r={compact ? 4.5 : 6} fill="none" strokeWidth={1.3} />
                    <line x1={cx} y1={y(targ) - (compact ? 4.5 : 6)} x2={cx} y2={y(targ) + (compact ? 4.5 : 6)} strokeWidth={1.3} />
                  </>
                ) : (
                  <>
                    <rect
                      x={cx - (compact ? 7 : 9)}
                      y={y(targ) - (compact ? 6 : 8)}
                      width={compact ? 14 : 18}
                      height={compact ? 12 : 16}
                      rx={2}
                      fill="var(--color-bg-raised)"
                      strokeWidth={1.2}
                    />
                    {!compact && (
                      <text x={cx} y={y(targ) + 3} textAnchor="middle" stroke="none" className="fill-current text-[8px]">
                        {op.name.slice(0, 3)}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          }

          const w = op.qubits[0] ?? 0;
          if (op.kind === 'measure') {
            return (
              <g key={i}>
                <rect
                  x={cx - (compact ? 7 : 9)}
                  y={y(w) - (compact ? 6 : 8)}
                  width={compact ? 14 : 18}
                  height={compact ? 12 : 16}
                  rx={2}
                  fill="var(--color-bg-raised)"
                  stroke="var(--color-text-muted)"
                  strokeWidth={1}
                />
                {/* meter arc — the conventional mark, so it reads without a legend */}
                <path
                  d={`M${cx - 4},${y(w) + 3} A4.5,4.5 0 0 1 ${cx + 4},${y(w) + 3}`}
                  fill="none"
                  stroke="var(--color-text-secondary)"
                  strokeWidth={1.1}
                />
                <line x1={cx} y1={y(w) + 3} x2={cx + 3} y2={y(w) - 3} stroke="var(--color-text-secondary)" strokeWidth={1.1} />
              </g>
            );
          }

          return (
            <g key={i}>
              <rect
                x={cx - (compact ? 7 : 9)}
                y={y(w) - (compact ? 6 : 8)}
                width={compact ? 14 : 18}
                height={compact ? 12 : 16}
                rx={2}
                fill="var(--color-bg-raised)"
                stroke="var(--color-border-control)"
                strokeWidth={1}
              />
              {!compact && (
                <text x={cx} y={y(w) + 3} textAnchor="middle" className="metric fill-text-primary text-[8px]">
                  {op.name.slice(0, 3)}
                </text>
              )}
            </g>
          );
        })}

        {truncated && (
          <text x={W - padR} y={H - 3} textAnchor="end" className="fill-current text-[9px]">
            truncated
          </text>
        )}
      </svg>
    </div>
  );
}
