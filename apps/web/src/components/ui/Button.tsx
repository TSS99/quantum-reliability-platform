import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'neon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// design_tokens hue_policy: hue carries MEANING, so the workhorse actions stay neutral. The `neon`
// variant is the one deliberate exception — a hero CTA, where the glow IS the message.
const base =
  'relative inline-flex items-center justify-center gap-2 rounded-control border text-body-s font-medium ' +
  'hx-mag hx-shine disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:transform-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-action-bg text-action-fg border-transparent hover:bg-action-hover active:bg-action-active ' +
    'disabled:bg-action-disabled-bg disabled:text-action-disabled-fg px-4 py-2',
  secondary:
    'bg-transparent text-text-primary border-border-control hover:bg-row-hover ' +
    'disabled:text-text-muted disabled:border-border-hairline px-4 py-2',
  ghost:
    'bg-transparent text-text-secondary border-transparent hover:bg-row-hover hover:text-text-primary ' +
    'disabled:text-text-muted px-2.5 py-1.5',
  neon:
    'hx-border bg-bg-raised/70 text-text-primary border-border-control px-5 py-2.5 backdrop-blur-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', ...props },
  ref,
) {
  return <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />;
});
