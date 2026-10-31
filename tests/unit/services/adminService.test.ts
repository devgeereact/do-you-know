import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminApiError, adminClient, adminErrorMessage } from '@/services/adminService';

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('adminService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the Clerk token and an empty JSON body for action routes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { quiz: {} }));
    vi.stubGlobal('fetch', fetchMock);
    await adminClient(() => Promise.resolve('tok')).submit('abc');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/admin/quizzes/abc/submit');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{}');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('keeps 422 details as problems', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        reply(422, {
          error: {
            code: 'invalid_questions',
            details: [{ index: 2, field: 'question', message: 'each question must be an object' }],
          },
        }),
      ),
    );
    const err = await adminClient(() => Promise.resolve('tok'))
      .append('abc', [])
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminApiError);
    expect((err as AdminApiError).problems).toEqual([
      { index: 2, field: 'question', message: 'each question must be an object' },
    ]);
    expect(adminErrorMessage(err)).toBe('Some questions need fixing.');
  });

  it('builds list queries and refuses without a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await adminClient(() => Promise.resolve('tok')).rounds({ q: 'fox', hidden: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/admin/rounds?q=fox&hidden=1');
    await expect(adminClient(() => Promise.resolve(null)).todo()).rejects.toMatchObject({
      status: 401,
    });
  });
});
