import { beforeEach, describe, expect, it, vi } from 'vitest';

type ApiModule = typeof import('@/lib/api');

const STORAGE_KEY = 'dyk-guest';
const future = (): string => new Date(Date.now() + 3600_000).toISOString();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** api.ts keeps the token in module state, so each test gets a fresh copy. */
async function load(): Promise<ApiModule> {
  vi.resetModules();
  return import('@/lib/api');
}

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function lastCall(): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error('fetch was not called');
  return { url: String(call[0]), init: call[1] ?? {} };
}

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
});

describe('api(): request shape', () => {
  it('sends a GET without a body or content type when there is no body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const { api } = await load();
    await expect(api('/categories')).resolves.toEqual({ ok: true });
    const { url, init } = lastCall();
    expect(url).toBe('/api/v1/categories');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({});
    expect(init.cache).toBe('no-store');
  });

  it('sends a JSON POST when a body is given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ attempt_id: 'a1' }));
    const { api } = await load();
    await api('/attempts', { body: { mode: 'practice' } });
    const { init } = lastCall();
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"mode":"practice"}');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('honours an explicit method', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const { api } = await load();
    await api('/session', { method: 'DELETE' });
    expect(lastCall().init.method).toBe('DELETE');
  });

  it('builds a query string and drops undefined, null and empty values', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const { api } = await load();
    await api('/leaderboards', {
      query: { quiz_slug: 'space', board: 'all_time', limit: 5, none: undefined, nil: null, e: '' },
    });
    expect(lastCall().url).toBe('/api/v1/leaderboards?quiz_slug=space&board=all_time&limit=5');
  });

  it('keeps zero as a real query value and encodes awkward characters', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const { api } = await load();
    await api('/x', { query: { page: 0, q: 'a b&c' } });
    expect(lastCall().url).toBe('/api/v1/x?page=0&q=a+b%26c');
  });

  it('attaches a timeout signal', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const { api } = await load();
    await api('/health');
    expect(lastCall().init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('api(): error handling', () => {
  it('throws ApiError carrying the server code and status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'quiz_not_found' } }, 404));
    const { api, ApiError } = await load();
    const error = await api('/quizzes/nope').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'quiz_not_found', status: 404, message: 'quiz_not_found' });
  });

  it('falls back to request_failed when the error body has no code', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ oops: true }, 500));
    const { api } = await load();
    await expect(api('/x')).rejects.toMatchObject({ code: 'request_failed', status: 500 });
  });

  it('survives a non-JSON error body such as a gateway HTML page', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    const { api } = await load();
    await expect(api('/x')).rejects.toMatchObject({ code: 'request_failed', status: 502 });
  });

  it('maps a thrown fetch (offline, DNS, timeout) to network_error with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { api } = await load();
    await expect(api('/x')).rejects.toMatchObject({ code: 'network_error', status: 0 });
  });

  it('returns null for an empty 200 body without throwing', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));
    const { api } = await load();
    await expect(api('/daily')).resolves.toBeNull();
  });

  it('forgets the stored guest on a 401 so the next call can start a new session', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'guest_abc', expires_at: future() }));
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'not_signed_in' } }, 401));
    const { api, hasSession } = await load();
    expect(hasSession()).toBe(true);
    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(hasSession()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the guest on other errors such as 403 or 500', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'guest_abc', expires_at: future() }));
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'forbidden' } }, 403));
    const { api, hasSession } = await load();
    await expect(api('/me')).rejects.toMatchObject({ status: 403 });
    expect(hasSession()).toBe(true);
  });
});

describe('guest session', () => {
  it('starts with no session and sends no Authorization header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const { api, hasSession } = await load();
    expect(hasSession()).toBe(false);
    await api('/me');
    expect(lastCall().init.headers).not.toHaveProperty('Authorization');
  });

  it('restores an unexpired guest token from storage and sends it as a bearer token', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'guest_abc', expires_at: future() }));
    fetchMock.mockResolvedValue(jsonResponse({}));
    const { api, hasSession } = await load();
    expect(hasSession()).toBe(true);
    await api('/me');
    expect(lastCall().init.headers).toMatchObject({ Authorization: 'Bearer guest_abc' });
  });

  it('ignores a token without the guest_ prefix in storage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'user_abc', expires_at: future() }));
    const { hasSession } = await load();
    expect(hasSession()).toBe(false);
  });

  // The server slides the expiry while the player keeps playing, so the stored date is only a
  // hint: the token is kept and the server's 401 decides.
  it.each([
    ['a past expiry', { token: 'guest_old', expires_at: '2000-01-01T00:00:00Z' }],
    ['an unparseable expiry', { token: 'guest_abc', expires_at: 'never' }],
  ])('keeps a guest token with %s until the server rejects it', async (_name, stored) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'not_signed_in' } }, 401));
    const { api, hasSession } = await load();
    expect(hasSession()).toBe(true);
    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(hasSession()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ignores corrupt storage rather than crashing at import time', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { hasSession } = await load();
    expect(hasSession()).toBe(false);
  });

  it('ensureGuest creates one session even when called concurrently, then stores it', async () => {
    const guest = { token: 'guest_new', expires_at: future() };
    fetchMock.mockResolvedValue(jsonResponse(guest));
    const { ensureGuest, hasSession } = await load();
    await Promise.all([ensureGuest(), ensureGuest(), ensureGuest()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastCall().url).toBe('/api/v1/guest-sessions');
    expect(lastCall().init.method).toBe('POST');
    expect(hasSession()).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(guest);
  });

  it('ensureGuest does nothing when a session already exists', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'guest_abc', expires_at: future() }));
    const { ensureGuest } = await load();
    await ensureGuest();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ensureGuest can be retried after a failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'guest_ok', expires_at: future() }));
    const { ensureGuest, hasSession } = await load();
    await expect(ensureGuest()).rejects.toMatchObject({ code: 'network_error' });
    expect(hasSession()).toBe(false);
    await ensureGuest();
    expect(hasSession()).toBe(true);
  });

  it('clearSession forgets the token in memory and storage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'guest_abc', expires_at: future() }));
    const { clearSession, hasSession } = await load();
    clearSession();
    expect(hasSession()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('signOutGuest revokes on the server then forgets locally', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'guest_abc', expires_at: future() }));
    fetchMock.mockResolvedValue(jsonResponse({}));
    const { signOutGuest, hasSession } = await load();
    await signOutGuest();
    expect(lastCall().url).toBe('/api/v1/session');
    expect(lastCall().init.method).toBe('DELETE');
    expect(hasSession()).toBe(false);
  });

  it('signOutGuest still forgets locally when the server call fails', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'guest_abc', expires_at: future() }));
    fetchMock.mockRejectedValue(new TypeError('offline'));
    const { signOutGuest, hasSession } = await load();
    await expect(signOutGuest()).resolves.toBeUndefined();
    expect(hasSession()).toBe(false);
  });

  it('signOutGuest makes no request when there is no session', async () => {
    const { signOutGuest } = await load();
    await signOutGuest();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
