import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import * as game from '@/services/gameService';
import * as profiles from '@/services/profileService';
import { profile } from '../support/fixtures';

vi.mock('@/services/gameService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/gameService')>()),
  getDailyToday: vi.fn(),
  hasFinishedDaily: vi.fn(),
}));
vi.mock('@/services/profileService');
vi.mock('@/lib/sentry', () => ({ reportError: vi.fn() }));

const session = { user: null as { id: string } | null, loading: false };
vi.mock('@/hooks/useSession', () => ({ useSession: () => session }));

const daily = {
  id: 'd1',
  date: '2026-10-17',
  quiz: { slug: 'space', title: 'Space', cover_image_url: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
  session.user = null;
  session.loading = false;
  vi.mocked(game.getDailyToday).mockResolvedValue(daily);
  vi.mocked(game.hasFinishedDaily).mockResolvedValue(false);
  vi.mocked(profiles.getProfile).mockResolvedValue(profile());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDailyChallenge', () => {
  it('shows today for a visitor without a session and asks nothing personal', async () => {
    const { result } = renderHook(() => useDailyChallenge());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.today?.quiz.slug).toBe('space');
    expect(result.current.playedToday).toBe(false);
    expect(result.current.streak).toBe(0);
    expect(game.hasFinishedDaily).not.toHaveBeenCalled();
    expect(profiles.getProfile).not.toHaveBeenCalled();
  });

  it('is null when no challenge is live', async () => {
    vi.mocked(game.getDailyToday).mockResolvedValue(null);
    const { result } = renderHook(() => useDailyChallenge());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.today).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reports played-today and a live streak for a signed-in guest', async () => {
    session.user = { id: 'p1' };
    vi.mocked(game.hasFinishedDaily).mockResolvedValue(true);
    vi.mocked(profiles.getProfile).mockResolvedValue(
      profile({ streak_current: 4, last_daily_date: '2026-10-17' }),
    );
    const { result } = renderHook(() => useDailyChallenge());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(game.hasFinishedDaily).toHaveBeenCalledWith('d1');
    expect(result.current.playedToday).toBe(true);
    expect(result.current.streak).toBe(4);
  });

  it('keeps a streak alive when the last daily was yesterday', async () => {
    session.user = { id: 'p1' };
    vi.mocked(profiles.getProfile).mockResolvedValue(
      profile({ streak_current: 2, last_daily_date: '2026-10-16' }),
    );
    const { result } = renderHook(() => useDailyChallenge());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streak).toBe(2);
  });

  it('shows no streak once a day has been missed', async () => {
    session.user = { id: 'p1' };
    vi.mocked(profiles.getProfile).mockResolvedValue(
      profile({ streak_current: 9, last_daily_date: '2026-10-10' }),
    );
    const { result } = renderHook(() => useDailyChallenge());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streak).toBe(0);
  });

  it('shows a friendly error when loading fails', async () => {
    vi.mocked(game.getDailyToday).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDailyChallenge());
    await waitFor(() => expect(result.current.error).toMatch(/couldn.t load today/i));
    expect(result.current.today).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
