import { env } from '@/lib/env';

/**
 * The only door to the PHP API on cPanel (`/api/v1`). Players are guests: the server
 * issues an opaque `guest_` token, kept in this browser only. The server grades,
 * times, scores and checks ownership; this client just passes requests through.
 * Errors throw an ApiError whose message is the server's short code, so
 * gameErrorMessage() can turn it into friendly copy.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

interface StoredGuest {
  token: string;
  expires_at: string;
}

const STORAGE_KEY = 'dyk-guest';
let token: string | null = readStoredToken();
let pendingGuest: Promise<string> | null = null;

function readStoredToken(): string | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredGuest | null;
    if (stored?.token.startsWith('guest_') && Date.parse(stored.expires_at) > Date.now()) {
      return stored.token;
    }
  } catch {
    /* Storage may be blocked; the player can still play in memory. */
  }
  return null;
}

type Query = Record<string, string | number | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Query;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  const url = `${env.apiUrl.replace(/\/$/, '')}${path}${search ? `?${search}` : ''}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ApiError('network_error', 0);
  }
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: { code?: string } })
    | null;
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new ApiError(data?.error?.code ?? 'request_failed', response.status);
  }
  return data as T;
}

export function hasSession(): boolean {
  return token !== null;
}

/** Creates a guest session once per browser; concurrent callers share one request. */
export async function ensureGuest(): Promise<void> {
  if (token) return;
  pendingGuest ??= api<StoredGuest>('/guest-sessions', { body: {} })
    .then((guest) => {
      token = guest.token;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(guest));
      } catch {
        /* Optional persistence. */
      }
      return guest.token;
    })
    .finally(() => {
      pendingGuest = null;
    });
  await pendingGuest;
}

/** Forgets this browser's guest token. */
export function clearSession(): void {
  token = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing stored. */
  }
}

/** Revokes the guest token on the server, then forgets it here. */
export async function signOutGuest(): Promise<void> {
  if (token) await api<unknown>('/session', { method: 'DELETE' }).catch(() => undefined);
  clearSession();
}
