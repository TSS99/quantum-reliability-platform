// Signature element (RECON-23 / design_tokens.rail): the Reliability Transformation Rail.
// ONE component, two modes. Six stages a workload passes through. This is the Phase-2
// SKELETON — structure, states and labels are real; live values (the data-bound trace
// amplitude) wire in Phase 4. Reduced motion is handled globally (static stepper).
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
  active: 'border-border-control bg-bg-raised text-text-primary',
  complete: 'border-border-control bg-bg-raised text-text-primary',
  blocked: 'border-border-strong bg-state-critical-bg text-state-critical',
};

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
        return (
          <li key={s.key} className="flex items-center gap-3 md:flex-1 md:flex-col md:gap-2 md:text-center">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control border ${nodeTone[state]}`}
            >
              <Icon size={16} aria-hidden strokeWidth={2} />
            </div>
            <div className="md:mt-1">
              <div className="text-body-s font-medium text-text-primary">{s.label}</div>
              <div className="text-caption capitalize text-text-muted">{state}</div>
            </div>
            {i < STAGES.length - 1 && (
              <div className="hidden h-px flex-1 self-center bg-border-hairline md:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
