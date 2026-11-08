import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.fn();
let epoch = 0;
vi.mock('@/lib/api', () => ({
  api: (...args: unknown[]) => api(...args),
  clearSession: vi.fn(),
  sessionEpoch: () => epoch,
}));

import { getProfile, setNickname } from '@/services/profileService';

const profile = (nickname: string): unknown => ({ id: 'p1', nickname });

beforeEach(() => {
  api.mockReset();
  epoch = 0;
});

describe('getProfile', () => {
  it('shares one request between callers that ask at the same time', async () => {
    let release: (v: unknown) => void = () => undefined;
    api.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const [a, b, c, d] = [getProfile(), getProfile(), getProfile(), getProfile()];
    release(profile('BraveOtter42'));
    expect((await Promise.all([a, b, c, d])).map((p) => p.nickname)).toEqual(
      Array(4).fill('BraveOtter42'),
    );
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith('/me');
  });

  it('does not cache: a call after the first has finished asks the server again', async () => {
    api.mockResolvedValueOnce(profile('One')).mockResolvedValueOnce(profile('Two'));
    expect((await getProfile()).nickname).toBe('One');
    expect((await getProfile()).nickname).toBe('Two');
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('never hands out a profile fetched before a change made here', async () => {
    let release: (v: unknown) => void = () => undefined;
    api.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    const stale = getProfile();
    api.mockResolvedValueOnce({ nickname: 'New' }); // the nickname change
    await setNickname('New');
    api.mockResolvedValueOnce(profile('New'));
    const fresh = await getProfile();
    release(profile('Old'));
    expect(fresh.nickname).toBe('New');
    expect((await stale).nickname).toBe('Old');
    expect(api).toHaveBeenCalledTimes(3);
  });

  it('lets the next caller retry after a failure', async () => {
    api.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(profile('Back'));
    await expect(getProfile()).rejects.toThrow('offline');
    expect((await getProfile()).nickname).toBe('Back');
  });

  it('never joins a request that was sent under another session', async () => {
    let releaseA: (v: unknown) => void = () => undefined;
    api.mockReturnValueOnce(new Promise((resolve) => (releaseA = resolve)));
    const first = getProfile(); // guest A
    epoch += 1; // the device is handed over, signed out or given a new guest
    api.mockResolvedValueOnce(profile('GuestB'));
    const second = await getProfile();
    expect(second.nickname).toBe('GuestB');
    expect(api).toHaveBeenCalledTimes(2);
    releaseA(profile('GuestA'));
    expect((await first).nickname).toBe('GuestA');
  });

  it('still shares one request while the session stays the same', async () => {
    let release: (v: unknown) => void = () => undefined;
    api.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const [a, b] = [getProfile(), getProfile()];
    release(profile('Same'));
    await Promise.all([a, b]);
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('a failed change still forgets the request in flight', async () => {
    let release: (v: unknown) => void = () => undefined;
    api.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    const before = getProfile();
    api.mockRejectedValueOnce(new Error('nickname_taken'));
    await expect(setNickname('Taken')).rejects.toThrow('nickname_taken');
    api.mockResolvedValueOnce(profile('Fresh'));
    expect((await getProfile()).nickname).toBe('Fresh');
    release(profile('Old'));
    await before;
  });
});
