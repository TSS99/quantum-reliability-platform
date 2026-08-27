import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { Layout } from '../Layout';
import { ROUTES, NAV_GROUPS } from '../nav';

// UX_MAP §1.3: five groups, nine leaves, grouped nav; RECON-22 nav renders implemented
// routes visibly distinct from planned ones (never dead/greyed-out, but labelled).
describe('Layout nav', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders all 9 routes, grouped under the 5 nav groups', () => {
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <Layout />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: /primary/i });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(ROUTES.length);
    expect(ROUTES.length).toBe(9);

    for (const group of NAV_GROUPS) {
      expect(within(nav).getByText(group)).toBeInTheDocument();
    }
    for (const route of ROUTES) {
      expect(within(nav).getByRole('link', { name: new RegExp(route.label, 'i') })).toBeInTheDocument();
    }
  });

  it('marks planned (not-yet-implemented) routes distinctly, without hiding them', () => {
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <Layout />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: /primary/i });
    const plannedCount = ROUTES.filter((r) => !r.implemented).length;
    expect(within(nav).getAllByText('planned')).toHaveLength(plannedCount);
  });

  it('theme toggle flips document [data-theme] and its own accessible name', () => {
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <Layout />
      </MemoryRouter>,
    );
    // dark-first default (RECON-27)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const toggle = screen.getByRole('button', { name: /switch to light theme/i });

    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
