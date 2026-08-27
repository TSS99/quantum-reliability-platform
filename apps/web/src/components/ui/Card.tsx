export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
}

/** Elevation-1 surface: a machined hairline-bordered panel (design_tokens.elevation). */
export function Card({ as: Tag = 'div', className = '', children, ...props }: CardProps) {
  return (
    <Tag
      className={`rounded-card border border-border-hairline bg-bg-surface ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
