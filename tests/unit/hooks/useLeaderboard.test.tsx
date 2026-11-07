import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import * as service from '@/services/gameService';
import * as sentry from '@/lib/sentry';
import { ApiError } from '@/lib/api';

vi.mock('@/services/gameService');
vi.mock('@/lib/sentry', () => ({ reportError: vi.fn() }));

const session = { user: null as { id: string } | null, loading: false };
vi.mock('@/hooks/useSession', () => ({ useSession: () => session }));

const getLeaderboard = vi.mocked(service.getLeaderboard);
const board = { top: [], me: null };

beforeEach(() => {
  vi.clearAllMocks();
  session.user = null;
  session.loading = false;
  getLeaderboard.mockResolvedValue(board);
});

describe('useLeaderboard', () => {
  it('loads a quiz board with the requested limit', async () => {
    const { result } = renderHook(() => useLeaderboard('space', 'all_time', 10));
    await waitFor(() => expect(result.current.data).toEqual(board));
    expect(getLeaderboard).toHaveBeenCalledWith('space', 'all_time', 10);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('waits for the session to settle so "your rank" is correct', () => {
    session.loading = true;
    renderHook(() => useLeaderboard(null, 'daily'));
    expect(getLeaderboard).not.toHaveBeenCalled();
  });

  it('maps a known rule error to friendly copy without reporting it', async () => {
    getLeaderboard.mockRejectedValue(new ApiError('invalid_board', 400));
    const { result } = renderHook(() => useLeaderboard('space', 'weekly'));
    await waitFor(() => expect(result.current.error).toMatch(/couldn.t load that leaderboard/i));
    expect(sentry.reportError).not.toHaveBeenCalled();
  });

  it('reports an unexpected failure and asks the player to check their connection', async () => {
    getLeaderboard.mockRejectedValue(new ApiError('network_error', 0));
    const { result } = renderHook(() => useLeaderboard('space', 'all_time'));
    await waitFor(() => expect(result.current.error).toMatch(/check your connection/i));
    expect(result.current.data).toBeNull();
  });

  it('refresh fetches again', async () => {
    const { result } = renderHook(() => useLeaderboard('space', 'all_time'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.refresh());
    expect(getLeaderboard).toHaveBeenCalledTimes(2);
  });

  describe('live refresh', () => {
    const setVisibility = (state: 'visible' | 'hidden'): void => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    };
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      setVisibility('visible');
    });
    afterEach(() => {
      vi.useRealTimers();
      setVisibility('visible');
    });

    it('reloads on the beat while the page is on screen', async () => {
      const { result } = renderHook(() => useLeaderboard(null, 'daily', 50, 10_000));
      await waitFor(() => expect(result.current.data).toEqual(board));
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(getLeaderboard).toHaveBeenCalledTimes(3);
    });

    it('never shows a spinner for a quiet reload', async () => {
      const { result } = renderHook(() => useLeaderboard(null, 'daily', 50, 10_000));
      await waitFor(() => expect(result.current.loading).toBe(false));
      getLeaderboard.mockImplementation(() => new Promise(() => undefined));
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(result.current.loading).toBe(false);
    });

    it('keeps the last board when a quiet reload fails', async () => {
      const { result } = renderHook(() => useLeaderboard(null, 'daily', 50, 10_000));
      await waitFor(() => expect(result.current.data).toEqual(board));
      getLeaderboard.mockRejectedValue(new ApiError('network_error', 0));
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(result.current.data).toEqual(board);
      expect(result.current.error).toBeNull();
      expect(sentry.reportError).not.toHaveBeenCalled();
    });

    it('does not reload while the page is hidden, and reloads when it returns', async () => {
      const { result } = renderHook(() => useLeaderboard(null, 'daily', 50, 10_000));
      await waitFor(() => expect(result.current.data).toEqual(board));
      setVisibility('hidden');
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(getLeaderboard).toHaveBeenCalledTimes(1);
      setVisibility('visible');
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(getLeaderboard).toHaveBeenCalledTimes(2);
    });

    it('stays still when no beat is asked for', async () => {
      const { result } = renderHook(() => useLeaderboard(null, 'daily', 50));
      await waitFor(() => expect(result.current.data).toEqual(board));
      await act(() => vi.advanceTimersByTimeAsync(60_000));
      expect(getLeaderboard).toHaveBeenCalledTimes(1);
    });
  });
});
