import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfile } from '@/hooks/useProfile';
import * as service from '@/services/profileService';
import * as sentry from '@/lib/sentry';
import { ApiError } from '@/lib/api';
import { profile } from '../support/fixtures';

vi.mock('@/services/profileService');
vi.mock('@/lib/sentry', () => ({ reportError: vi.fn() }));

const signOut = vi.fn(() => Promise.resolve());
const session = {
  user: { id: 'p1' } as { id: string } | null,
  loading: false,
  reload: () => Promise.resolve(),
};
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ ...session, ensureSession: vi.fn(), signOut }),
}));

const getProfile = vi.mocked(service.getProfile);

beforeEach(() => {
  vi.clearAllMocks();
  session.user = { id: 'p1' };
  session.loading = false;
  getProfile.mockResolvedValue(profile());
});

describe('useProfile', () => {
  it('loads the profile for a signed-in guest', async () => {
    getProfile.mockResolvedValue(profile({ nickname: 'BraveOtter42', age_band: 'under_13' }));
    const { result } = renderHook(() => useProfile());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile?.nickname).toBe('BraveOtter42');
    expect(result.current.isChild).toBe(true);
  });

  it('makes no request without a session', async () => {
    session.user = null;
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getProfile).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
    expect(result.current.isChild).toBe(false);
  });

  it('waits for the session to settle before loading', () => {
    session.loading = true;
    const { result } = renderHook(() => useProfile());
    expect(result.current.loading).toBe(true);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('treats 13 to 17 and adults as not children', async () => {
    getProfile.mockResolvedValue(profile({ age_band: '13_17' }));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    expect(result.current.isChild).toBe(false);
  });

  it('sets the age band, then reloads the profile', async () => {
    vi.mocked(service.setAgeBand).mockResolvedValue();
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    getProfile.mockResolvedValue(profile({ age_band: '18_plus' }));
    let ok = false;
    await act(async () => {
      ok = await result.current.setAgeBand('18_plus');
    });
    expect(ok).toBe(true);
    expect(service.setAgeBand).toHaveBeenCalledWith('18_plus');
    expect(result.current.profile?.age_band).toBe('18_plus');
  });

  it('maps a rule error to friendly copy and returns false', async () => {
    vi.mocked(service.setAgeBand).mockRejectedValue(new ApiError('age_band_locked', 409));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.setAgeBand('under_13');
    });
    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/already set/i);
    expect(sentry.reportError).not.toHaveBeenCalled();
  });

  it('reports unexpected errors and shows the generic message', async () => {
    vi.mocked(service.setNickname).mockRejectedValue(new ApiError('request_failed', 500));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.setNickname('QuizWhizz');
    });
    expect(result.current.error).toMatch(/something went wrong/i);
    expect(sentry.reportError).toHaveBeenCalledTimes(1);
  });

  it('clears an earlier error when the next action starts', async () => {
    vi.mocked(service.setNickname)
      .mockRejectedValueOnce(new ApiError('invalid_nickname', 400))
      .mockResolvedValueOnce('QuizWhizz');
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.setNickname('x');
    });
    expect(result.current.error).toMatch(/3.20/);
    await act(async () => {
      await result.current.setNickname('QuizWhizz');
    });
    expect(result.current.error).toBeNull();
  });

  it('returns the generated nickname when shuffling', async () => {
    vi.mocked(service.assignRandomNickname).mockResolvedValue('BraveOtter42');
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let nick: string | null = null;
    await act(async () => {
      nick = await result.current.shuffleNickname();
    });
    expect(nick).toBe('BraveOtter42');
  });

  it('deletes the account, drops the profile and signs out without reloading', async () => {
    vi.mocked(service.deleteMyAccount).mockResolvedValue();
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    getProfile.mockClear();
    let ok = false;
    await act(async () => {
      ok = await result.current.deleteAccount();
    });
    expect(ok).toBe(true);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(getProfile).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
  });

  it('keeps the player signed in when deletion fails', async () => {
    vi.mocked(service.deleteMyAccount).mockRejectedValue(new ApiError('request_failed', 500));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    let ok = true;
    await act(async () => {
      ok = await result.current.deleteAccount();
    });
    expect(ok).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
    expect(result.current.profile).not.toBeNull();
    expect(result.current.error).not.toBeNull();
  });
});
