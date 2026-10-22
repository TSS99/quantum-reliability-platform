import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Settings } from '../Settings';
import { clearToken, setEndpoint } from '../../services/backendSession';

// EMC-5: the IBM token is the one secret this page handles. backendSession.ts promises it lives
// in a module variable and nowhere else — this test holds that promise to the UI that feeds it.
function dump(storage: Storage): string {
  return Array.from({ length: storage.length }, (_, i) => storage.getItem(storage.key(i)!)).join('|');
}

describe('Settings — IBM token handling', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearToken();
    setEndpoint(null);
  });

  it('never persists the token to localStorage or sessionStorage', () => {
    render(<Settings />);
    const secret = 'ibm-secret-token-xyz';
    fireEvent.change(screen.getByLabelText(/IBM Quantum API token/i), { target: { value: secret } });
    fireEvent.click(screen.getByRole('button', { name: /hold/i }));

    expect(dump(localStorage)).not.toContain(secret);
    expect(dump(sessionStorage)).not.toContain(secret);
  });

  it('never echoes the held token back into the page', () => {
    render(<Settings />);
    const secret = 'ibm-secret-token-xyz';
    const input = screen.getByLabelText(/IBM Quantum API token/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: secret } });
    fireEvent.click(screen.getByRole('button', { name: /hold/i }));

    expect(screen.queryByText(secret)).not.toBeInTheDocument();
    expect(input.value).toBe('');
    expect(screen.getByText(/a token is held for this tab/i)).toBeInTheDocument();
  });

  it('forgets the token on demand, clearing the held state', () => {
    render(<Settings />);
    fireEvent.change(screen.getByLabelText(/IBM Quantum API token/i), { target: { value: 'another-secret' } });
    fireEvent.click(screen.getByRole('button', { name: /hold/i }));
    expect(screen.getByText(/a token is held for this tab/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /forget/i }));
    expect(screen.getByText(/no token held/i)).toBeInTheDocument();
  });
});
