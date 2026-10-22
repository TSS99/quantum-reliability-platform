import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Experiments } from '../Experiments';

// EMC-5: render coverage plus the keyboard path for the clickable run row (already made
// keyboard-operable — this asserts it actually works, not just that the markup exists).
describe('Experiments', () => {
  it('renders the runs table and a receipt for the default-selected run', () => {
    render(<Experiments />);
    expect(screen.getByRole('heading', { name: /runs.*reliability receipts/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/predicted error reduction/i)).toBeInTheDocument();
  });

  it('selects another run via Enter on its row, without a click', () => {
    render(<Experiments />);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('button');
    expect(rows.length).toBeGreaterThan(1);

    expect(rows[0]).toHaveAttribute('aria-pressed', 'true');
    expect(rows[1]).toHaveAttribute('aria-pressed', 'false');

    fireEvent.keyDown(rows[1]!, { key: 'Enter' });

    expect(rows[1]).toHaveAttribute('aria-pressed', 'true');
    expect(rows[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects another run via Space on its row', () => {
    render(<Experiments />);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('button');

    fireEvent.keyDown(rows[1]!, { key: ' ' });

    expect(rows[1]).toHaveAttribute('aria-pressed', 'true');
  });
});
