import type { StatusKey } from './semantic';
import { SEMANTIC } from './semantic';

export interface StatusBadgeProps {
  state: StatusKey;
  /** Override the default label text (still keeps icon + colour). */
  children?: React.ReactNode;
}

/** A status chip carrying all four channels: colour + icon + shape + text label. */
export function StatusBadge({ state, children }: StatusBadgeProps) {
  const s = SEMANTIC[state];
  const { Icon } = s;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip border border-border-hairline px-2 py-0.5 text-body-s ${s.bg} ${s.fg}`}
      data-state={state}
    >
      <Icon aria-hidden size={14} strokeWidth={2} />
      <span className="font-medium">{children ?? s.label}</span>
    </span>
  );
}
