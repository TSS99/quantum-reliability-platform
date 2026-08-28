// Signature element: the Reliability Transformation Rail, in the Deep Field language.
// Six stages joined by a trace that lights as far as the workload has reached; each stage is a
// glowing body rather than a boxed icon, and the active one carries a live pulse ring.
export type RailStageState = 'pending' | 'active' | 'complete' | 'blocked';

const STAGES: { key: string; label: string }[] = [
  { key: 'circuit', label: 'Circuit' },
  { key: 'hardware', label: 'Hardware' },
  { key: 'noise', label: 'Noise' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'execution', label: 'Execution' },
  { key: 'verification', label: 'Verification' },
];

export interface RailProps {
  mode?: 'app' | 'marketing';
  /** Per-stage state, keyed by stage key. Unset stages render as 'pending'. */
  states?: Partial<Record<string, RailStageState>>;
}

const dotTone: Record<RailStageState, string> = {
  pending: 'bg-transparent border border-border-control',
  active: 'bg-series-logical',
  complete: 'bg-series-mitigated',
  blocked: 'bg-state-critical',
};

const dotGlow: Record<RailStageState, string | undefined> = {
  pending: undefined,
  active: '0 0 22px 5px rgb(var(--glow-violet) / 0.8)',
  complete: '0 0 20px 4px rgb(var(--glow-cyan) / 0.75)',
  blocked: '0 0 18px 4px rgb(255 107 122 / 0.6)',
};

const labelTone: Record<RailStageState, string> = {
  pending: 'text-text-muted',
  active: 'text-series-logical',
  complete: 'text-text-secondary',
  blocked: 'text-state-critical',
};

export function Rail({ mode = 'app', states = {} }: RailProps) {
  return (
    <ol
      className="flex flex-col gap-4 md:flex-row md:items-start md:gap-0"
      aria-label="Reliability transformation stages"
      data-mode={mode}
    >
      {STAGES.map((s, i) => {
        const state = states[s.key] ?? 'pending';
        const reached = state === 'complete' || state === 'active';
        return (
          <li key={s.key} className="flex items-center gap-3 md:flex-1 md:flex-col md:gap-2.5 md:text-center">
            <div className="relative flex items-center md:w-full md:justify-center">
              {/* trace to the previous stage, lit only where the workload has reached */}
              {i > 0 && (
                <span
                  className="absolute right-1/2 hidden h-px w-full md:block"
                  style={{
                    background: reached
                      ? 'linear-gradient(90deg, rgb(var(--glow-cyan) / 0.12), rgb(var(--glow-cyan) / 0.6))'
                      : 'var(--color-border-hairline)',
                  }}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 block h-3 w-3 shrink-0 rounded-full transition-all duration-300 ${dotTone[state]}`}
                style={{ boxShadow: dotGlow[state] }}
              >
                {state === 'active' && <span className="qo-pulse absolute inset-0 rounded-full" aria-hidden />}
              </span>
            </div>
            <div>
              <div className="text-body-s text-text-primary">{s.label}</div>
              <div className={`text-caption capitalize ${labelTone[state]}`}>{state}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
