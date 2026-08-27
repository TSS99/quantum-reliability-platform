import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ScoreTerm {
  label: string;
  /** Signed contribution to the total, in the score's own units. */
  contribution: number;
  /** Optional weight, shown when the score is a weighted sum. */
  weight?: number;
  note?: string;
}

export interface ExplainedScoreProps {
  label: string;
  value: number;
  unit?: string;
  /** The exact terms that sum/compose to `value`. Always rendered — RECON-24 / MISSION §71:
   *  no composite number is shown without its formula being inspectable. */
  terms: ScoreTerm[];
  /** One-line human formula, e.g. "w_e·E + w_c·C + …". */
  formula?: string;
  defaultOpen?: boolean;
}

const fmt = (n: number) =>
  (n >= 0 ? '+' : '\u2212') + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 4 });

export function ExplainedScore({
  label,
  value,
  unit,
  terms,
  formula,
  defaultOpen = false,
}: ExplainedScoreProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="rounded-card border border-border-hairline bg-bg-surface p-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-eyebrow uppercase text-text-secondary">{label}</span>
        <span className="metric text-metric-l text-text-primary">
          {value.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          {unit ? <span className="ml-1 text-body-s text-text-muted">{unit}</span> : null}
        </span>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 text-body-s text-text-secondary hover:text-text-primary"
      >
        <ChevronDown
          size={14}
          className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
          aria-hidden
        />
        {open ? 'Hide breakdown' : 'How is this computed?'}
      </button>
      {open && (
        <div id={panelId} className="mt-2 border-t border-border-hairline pt-2">
          {formula && <p className="mono mb-2 text-code text-text-muted">{formula}</p>}
          <table className="w-full text-body-s">
            <thead>
              <tr className="text-text-muted">
                <th className="py-1 text-left font-medium">Term</th>
                {terms.some((t) => t.weight != null) && (
                  <th className="py-1 text-right font-medium">Weight</th>
                )}
                <th className="py-1 text-right font-medium">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr key={t.label} className="border-t border-border-hairline">
                  <td className="py-1 text-text-secondary">
                    {t.label}
                    {t.note && <span className="ml-1 text-text-muted">({t.note})</span>}
                  </td>
                  {terms.some((x) => x.weight != null) && (
                    <td className="metric py-1 text-right text-text-muted">{t.weight ?? '\u2014'}</td>
                  )}
                  <td className="metric py-1 text-right text-text-primary">{fmt(t.contribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
