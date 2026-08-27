import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '../StatusBadge';
import { ExplainedScore } from '../ExplainedScore';

describe('StatusBadge', () => {
  it('renders the text-label channel (not colour alone)', () => {
    render(<StatusBadge state="critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});

describe('ExplainedScore', () => {
  it('shows the value and reveals the term breakdown (RECON-24)', () => {
    render(
      <ExplainedScore
        label="Test score"
        value={0.5}
        defaultOpen
        formula="a + b"
        terms={[
          { label: 'a', contribution: 0.3 },
          { label: 'b', contribution: 0.2 },
        ]}
      />,
    );
    expect(screen.getByText('a + b')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });
});
