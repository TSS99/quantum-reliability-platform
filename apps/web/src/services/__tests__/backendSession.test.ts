import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALLOWED_ORIGINS,
  api,
  clearToken,
  getEndpoint,
  hasToken,
  setEndpoint,
  setToken,
} from '../backendSession';

/** Records what the last fetch actually received, without depending on mock tuple inference. */
function spyFetch(body = '{}', status = 200) {
  const seen = { url: '', init: undefined as RequestInit | undefined, headers: () => new Headers() };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.url = String(input);
      seen.init = init;
      seen.headers = () => new Headers(init?.headers);
      return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
    }),
  );
  return seen;
}

/**
 * The credential model for this deployment is per-user and browser-held. That promise is only
 * worth something if the token genuinely never reaches storage and never leaves in a URL, so
 * those are asserted directly rather than trusted to review.
 */
describe('backend session', () => {
  beforeEach(() => {
    localStorage.clear();
    clearToken();
    setEndpoint(ALLOWED_ORIGINS[0]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearToken();
  });

  it('never writes the token to any web storage', () => {
    setToken('secret-token-abc123');
    expect(hasToken()).toBe(true);

    const dumped = JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
    });
    expect(dumped).not.toContain('secret-token-abc123');
  });

  it('persists the endpoint, which is not a secret', () => {
    setEndpoint(`${ALLOWED_ORIGINS[0]}/`);
    // trailing slash trimmed so paths do not double up
    expect(getEndpoint()).toBe(ALLOWED_ORIGINS[0]);
    expect(JSON.stringify({ ...localStorage })).toContain(ALLOWED_ORIGINS[0]);
  });

  it('sends the token as a header and never in the URL', async () => {
    setToken('secret-token-abc123');
    const seen = spyFetch();

    await api('/api/v1/execution/jobs', { method: 'POST', body: '{}', sendToken: true });

    expect(seen.url).not.toContain('secret-token-abc123');
    expect(seen.headers().get('X-QRP-IBM-Token')).toBe('secret-token-abc123');
  });

  it('omits the token header entirely when no token is held', async () => {
    const seen = spyFetch();
    await api('/health', { sendToken: true });
    expect(seen.headers().has('X-QRP-IBM-Token')).toBe(false);
  });

  it('does not attach the token to calls that did not ask for it', async () => {
    setToken('secret-token-abc123');
    const seen = spyFetch();
    await api('/health');
    expect(seen.headers().has('X-QRP-IBM-Token')).toBe(false);
  });

  it('surfaces the backend reason code rather than a bare status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: { code: 'PAID_PLAN_REFUSED', message: 'not free' } }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    await expect(api('/api/v1/execution/jobs')).rejects.toMatchObject({
      code: 'PAID_PLAN_REFUSED',
      status: 402,
    });
  });

  it('reports an unreachable backend as such instead of throwing a raw network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(api('/health')).rejects.toMatchObject({ code: 'UNREACHABLE' });
  });

  it('refuses an endpoint that is not on the connect-src allowlist', async () => {
    // The page can hold an IBM token, so the set of hosts it may contact is a fixed list. The CSP
    // is the real enforcement; this check exists so the user gets a reason instead of a dead request.
    setEndpoint('https://not-our-backend.example');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('/health')).rejects.toMatchObject({ code: 'ENDPOINT_NOT_ALLOWED' });
    // and crucially it never left the browser
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses to call anything with no endpoint configured', async () => {
    setEndpoint(null);
    await expect(api('/health')).rejects.toMatchObject({ code: 'NO_ENDPOINT' });
  });
});
