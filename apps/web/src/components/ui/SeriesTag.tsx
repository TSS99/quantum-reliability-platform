import type { SeriesKey } from './semantic';
import { SEMANTIC } from './semantic';

export interface SeriesTagProps {
  series: SeriesKey;
  children?: React.ReactNode;
}

/** Series identity tag (raw / mitigated / logical) — a DIFFERENT scale from status,
 *  never shown in the same legend. Colour + icon + shape + text. */
export function SeriesTag({ series, children }: SeriesTagProps) {
  const s = SEMANTIC[series];
  const { Icon } = s;
  return (
    <span className={`inline-flex items-center gap-1.5 text-body-s ${s.fg}`} data-series={series}>
      <Icon aria-hidden size={13} strokeWidth={2} />
      <span className="font-medium">{children ?? s.label}</span>
    </span>
  );
}
