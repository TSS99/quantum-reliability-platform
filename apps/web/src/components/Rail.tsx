// Signature element (RECON-23 / design_tokens.rail): the Reliability Transformation Rail.
// ONE component, two modes. Six stages a workload passes through, joined by a live trace whose
// segments light as the stage completes. Structure, states and labels are real; the data-bound
// trace amplitude wires in with live plans. Reduced motion is handled globally.
import { Cpu, Waves, GitBranch, StepForward, BadgeCheck, CircuitBoard, type LucideIcon } from 'lucide-react';

export type RailStageState = 'pending' | 'active' | 'complete' | 'blocked';

const STAGES: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'circuit', label: 'Circuit', Icon: CircuitBoard },
  { key: 'hardware', label: 'Hardware', Icon: Cpu },
  { key: 'noise', label: 'Noise', Icon: Waves },
  { key: 'strategy', label: 'Strategy', Icon: GitBranch },
  { key: 'execution', label: 'Execution', Icon: StepForward },
  { key: 'verification', label: 'Verification', Icon: BadgeCheck },
];

export interface RailProps {
  mode?: 'app' | 'marketing';
  /** Per-stage state, keyed by stage key. Unset stages render as 'pending'. */
  states?: Partial<Record<string, RailStageState>>;
}

const nodeTone: Record<RailStageState, string> = {
  pending: 'border-border-hairline text-text-muted',
  active: 'border-series-mitigated text-series-mitigated',
  complete: 'border-border-control bg-bg-raised text-text-primary',
  blocked: 'border-border-strong bg-state-critical-bg text-state-critical',
};

const litGlow = { boxShadow: '0 0 0 1px rgb(var(--glow-cyan) / 0.35), 0 0 26px -4px rgb(var(--glow-cyan) / 0.55)' };

export function Rail({ mode = 'app', states = {} }: RailProps) {
  return (
    <ol
      className="flex flex-col gap-3 md:flex-row md:items-start md:gap-0"
      aria-label="Reliability transformation stages"
      data-mode={mode}
    >
      {STAGES.map((s, i) => {
        const state = states[s.key] ?? 'pending';
        const { Icon } = s;
        const done = state === 'complete';
        const active = state === 'active';
        return (
          <li
            key={s.key}
            className="qo-rise flex items-center gap-3 md:flex-1 md:flex-col md:gap-2 md:text-center"
            style={{ ['--i' as string]: i }}
          >
            <div className="flex w-full items-center gap-3 md:flex-col md:gap-2">
              <div className="relative flex items-center md:w-full md:justify-center">
                {/* connecting trace (desktop): lit up to the furthest reached stage */}
                {i > 0 && (
                  <span
                    className="absolute right-1/2 hidden h-px w-full md:block"
                    style={{
                      background: done || active
                        ? 'linear-gradient(90deg, rgb(var(--glow-cyan) / 0.15), rgb(var(--glow-cyan) / 0.7))'
                        : 'var(--color-border-hairline)',
                    }}
                    aria-hidden
                  />
                )}
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-control border transition-all duration-300 ${nodeTone[state]}`}
                  style={active || done ? litGlow : undefined}
                >
                  <Icon size={17} aria-hidden strokeWidth={1.9} />
                  {active && (
                    <span className="qo-pulse absolute inset-0 rounded-control" aria-hidden />
                  )}
                </div>
              </div>
              <div className="md:mt-0.5">
                <div className="text-body-s font-medium text-text-primary">{s.label}</div>
                <div className={`text-caption capitalize ${active ? 'text-series-mitigated' : 'text-text-muted'}`}>
                  {state}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
