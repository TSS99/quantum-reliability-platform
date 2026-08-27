import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Placeholder } from '../Placeholder';
import { ROUTES } from '../../app/nav';

// MISSION §43/§71: a planned surface says so plainly — no fabricated data, no dead controls,
// no "coming soon" spinner. It names the route and states the surface is not built yet.
describe('Placeholder', () => {
  it('shows the honest empty state, naming the current route', () => {
    // Every route is implemented now, so the Placeholder is the fallback surface; rendered at a
    // known route path it still names that route and states plainly that it is not built.
    const route = ROUTES[0]!;
    render(
      <MemoryRouter initialEntries={[route.path]}>
        <Placeholder />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: route.label })).toBeInTheDocument();
    expect(screen.getByText(/not built yet/i)).toBeInTheDocument();
    expect(screen.getByText(/intentionally empty/i)).toBeInTheDocument();
    // Must not fabricate data: no table/list rows, no numeric metrics rendered.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('falls back to a generic label for a path outside the known route table', () => {
    render(
      <MemoryRouter initialEntries={['/not-a-real-route']}>
        <Placeholder />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /planned surface/i })).toBeInTheDocument();
  });
});
