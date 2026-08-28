/**
 * Connection to a QRP backend, and the user's own IBM credential.
 *
 * The credential model chosen for this deployment is per-user and browser-held. Two rules follow
 * from that, and both are enforced here rather than left to each caller:
 *
 *   1. The token lives in a module variable and NOWHERE else. Not localStorage, not sessionStorage,
 *      not a cookie, not the URL. Closing the tab loses it, which is the intended trade: a token
 *      that is never written down cannot be read off a shared machine later.
 *   2. The endpoint URL is not secret, so it IS persisted — otherwise the user retypes it every
 *      visit for no security benefit.
 *
 * The static prototype works with no backend at all; everything here is additive.
 */

const ENDPOINT_KEY = 'qrp.backend.endpoint';

/**
 * Origins the page is permitted to talk to.
 *
 * This MIRRORS the `connect-src` allowlist in index.html and exists only to produce a good error:
 * the CSP is the actual enforcement, and the browser will refuse anything not on that list whether
 * or not this check runs. Keeping a copy here means a user who types their own URL is told why it
 * will not work, instead of watching a request fail as "unreachable".
 *
 * The allowlist is also the trust boundary for the credential: this page can hold an IBM token, so
 * the set of hosts it may post to is a deliberate, reviewable list rather than "any https host".
 */
export const ALLOWED_ORIGINS = [
  'https://qrp-api.onrender.com',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
] as const;

export function isAllowedEndpoint(url: string): boolean {
  try {
    return ALLOWED_ORIGINS.includes(new URL(url).origin as (typeof ALLOWED_ORIGINS)[number]);
  } catch {
    return false;
  }
}

/** In-memory only, by design. Never persisted. */
let ibmToken: string | null = null;

let endpoint: string | null = readEndpoint();

function readEndpoint(): string | null {
  try {
    return localStorage.getItem(ENDPOINT_KEY);
  } catch {
    // Private windows and blocked site data both throw; the app must still run.
    return null;
  }
}

export function getEndpoint(): string | null {
  return endpoint;
}

export function setEndpoint(url: string | null): void {
  endpoint = url && url.trim() ? url.trim().replace(/\/+$/, '') : null;
  try {
    if (endpoint) localStorage.setItem(ENDPOINT_KEY, endpoint);
    else localStorage.removeItem(ENDPOINT_KEY);
  } catch {
    /* not persisting is survivable; the in-memory value still works this session */
  }
}

export function hasToken(): boolean {
  return ibmToken !== null && ibmToken.length > 0;
}

export function setToken(token: string | null): void {
  ibmToken = token && token.trim() ? token.trim() : null;
}

export function clearToken(): void {
  ibmToken = null;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export class BackendError extends Error implements ApiError {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Call the backend. The token is attached as a header and only when one is set — never as a query
 * parameter, which would leak it into access logs, history and referrers.
 */
export async function api<T>(path: string, init?: RequestInit & { sendToken?: boolean }): Promise<T> {
  const base = endpoint;
  if (!base) throw new BackendError('No backend endpoint is configured.', 'NO_ENDPOINT', 0);
  if (!isAllowedEndpoint(base)) {
    // Refuse before the request rather than letting the CSP reject it as an opaque network error.
    throw new BackendError(
      `${base} is not on this build's connect-src allowlist, so the browser will not let this page ` +
        'contact it. Allowed: ' + ALLOWED_ORIGINS.join(', ') + '.',
      'ENDPOINT_NOT_ALLOWED',
      0,
    );
  }

  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  if (init?.sendToken && ibmToken) headers.set('X-QRP-IBM-Token', ibmToken);

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers });
  } catch {
    // A CORS rejection and a dead host are indistinguishable from here; say so rather than guess.
    throw new BackendError(
      'Could not reach the backend. It may be asleep, offline, or not allowing this origin.',
      'UNREACHABLE',
      0,
    );
  }

  if (!res.ok) {
    let code = 'HTTP_ERROR';
    let message = `Backend returned ${res.status}.`;
    try {
      const body = await res.json();
      const detail = body?.detail;
      if (detail?.code) code = detail.code;
      if (detail?.message) message = detail.message;
    } catch {
      /* a non-JSON error body is still an error; the status carries the meaning */
    }
    throw new BackendError(message, code, res.status);
  }

  return (await res.json()) as T;
}

export interface ExecutionPolicy {
  submission_enabled: boolean;
  max_shots: number;
  spend_ceiling_usd: number;
  plan_policy: string;
  credential_model: string;
  job_durability: string;
}

export interface HardwareJob {
  job_id: string;
  backend_id: string;
  shots: number;
  status: 'submitted' | 'queued' | 'running' | 'completed' | 'failed' | 'unknown';
  provider_job_id: string | null;
  counts: Record<string, number> | null;
  error: string | null;
  error_code: string | null;
  provenance: 'measured' | null;
  durability: string;
}

export const backend = {
  health: () => api<{ status: string; qrp_version: string }>('/health'),
  executionPolicy: () => api<ExecutionPolicy>('/api/v1/execution/status'),
  submitJob: (body: { qasm: string; backend_id: string; shots: number }) =>
    api<HardwareJob>('/api/v1/execution/jobs', {
      method: 'POST',
      body: JSON.stringify(body),
      sendToken: true,
    }),
  pollJob: (jobId: string) =>
    api<HardwareJob>(`/api/v1/execution/jobs/${encodeURIComponent(jobId)}`, { sendToken: true }),
};
