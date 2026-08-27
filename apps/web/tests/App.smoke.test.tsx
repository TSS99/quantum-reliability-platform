import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('App', () => {
  it('renders the hello route', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /quantum reliability platform/i })).toBeInTheDocument();
  });
});
