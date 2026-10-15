import { useCallback, useEffect, useRef, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { getLeaderboard } from '@/services/leaderboardService';
import { reportError } from '@/lib/sentry';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { copy } from '@/lib/copy';
import type { Board, Leaderboard } from '@/types';

interface UseLeaderboard {
  data: Leaderboard | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
export function useLeaderboard(quizSlug: string | null, board: Board, limit = 50): UseLeaderboard {
  const { user } = useSupabaseAuth();
  const key = JSON.stringify([quizSlug, board, limit, user?.id]);
  const [resolved, setResolved] = useState<string | null>(null);
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async (): Promise<void> => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result =
        !quizSlug && board !== 'daily'
          ? { top: [], me: null }
          : await getLeaderboard(quizSlug, board, limit, controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch (cause) {
      if (!controller.signal.aborted) {
        const fault =
          cause &&
          typeof cause === 'object' &&
          'message' in cause &&
          typeof cause.message === 'string'
            ? { message: cause.message }
            : undefined;
        if (!isGameError(fault)) reportError(cause, { feature: 'leaderboard' });
        setError(isGameError(fault) ? gameErrorMessage(fault) : copy.compete.boardError);
      }
    } finally {
      if (!controller.signal.aborted) {
        setResolved(key);
        setLoading(false);
      }
    }
  }, [quizSlug, board, limit, key]);
  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);
  return {
    data: resolved === key ? data : null,
    loading: loading || resolved !== key,
    error: resolved === key ? error : null,
    refresh,
  };
}
