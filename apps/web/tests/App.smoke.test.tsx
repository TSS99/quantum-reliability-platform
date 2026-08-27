import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('App', () => {
  it('renders the landing hero at /', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /reliability intelligence for quantum workloads/i }),
    ).toBeInTheDocument();
  });
});
