import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// design_tokens hue_policy: interactive affordances carry NO hue. The primary action is a
// high-contrast NEUTRAL (action.* tokens), which is what keeps the 7 semantic hues legible.
const base =
  'inline-flex items-center justify-center gap-2 rounded-control border text-body-s font-medium ' +
  'transition-all duration-200 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:
    'bg-action-bg text-action-fg border-transparent hover:bg-action-hover hover:-translate-y-0.5 active:bg-action-active ' +
    'disabled:bg-action-disabled-bg disabled:text-action-disabled-fg px-3 py-1.5',
  secondary:
    'bg-transparent text-text-primary border-border-control hover:bg-row-hover ' +
    'disabled:text-text-muted disabled:border-border-hairline px-3 py-1.5',
  ghost:
    'bg-transparent text-text-secondary border-transparent hover:bg-row-hover hover:text-text-primary ' +
    'disabled:text-text-muted px-2 py-1',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', ...props },
  ref,
) {
  return <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />;
});
