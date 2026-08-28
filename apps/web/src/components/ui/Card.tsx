export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  /** Adds the edge-lit top rail — use for hero/primary panels, not every card. */
  lit?: boolean;
  /** Adds hover lift; use when the card is interactive or scannable. */
  interactive?: boolean;
}

/** Instrument panel: translucent plate + hairline edge + light-catch (futuristic.css). */
export function Card({ as: Tag = 'div', className = '', lit, interactive, children, ...props }: CardProps) {
  return (
    <Tag
      className={
        'relative rounded-card qo-glass ' +
        (lit ? 'qo-lit ' : '') +
        (interactive ? 'qo-hover hx-spot hx-border ' : '') +
        className
      }
      {...props}
    >
      {children}
    </Tag>
  );
}
