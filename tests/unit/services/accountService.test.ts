import { afterEach, describe, expect, it, vi } from 'vitest';
import { linkAdultSession } from '@/services/accountService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('linkAdultSession', () => {
  it('posts the adult confirmation with the Clerk token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ profile_id: 'p1', linked_game_history: false }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await linkAdultSession(() => Promise.resolve('clerk-token'));
    expect(result?.profile_id).toBe('p1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/account\/session$/);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer clerk-token');
    expect(JSON.parse(String(init.body))).toEqual({ adult_confirmed: true });
  });

  it('does nothing when Clerk has no token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await linkAdultSession(() => Promise.resolve(null))).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
