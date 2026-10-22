import { render, screen } from '@testing-library/react';
import { RouterProvider, type RouteObject } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createRouter } from '../createRouter';

// EMC-3: a thrown error in any route must render a recoverable fallback — not a blank page.
function Boom(): never {
  throw new Error('boom from a route component');
}

describe('createRouter error boundary', () => {
  it('renders a recoverable fallback (message + retry + go-home) when a route throws', () => {
    const routes: RouteObject[] = [{ path: '/', element: <Boom /> }];
    const router = createRouter(routes, 'browser');
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/boom from a route component/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('attaches the fallback to a nested layout route too, so a child page throwing is also caught', () => {
    const routes: RouteObject[] = [{ path: '/', children: [{ index: true, element: <Boom /> }] }];
    const router = createRouter(routes, 'browser');
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
