import { useCallback, useEffect, useState } from 'react';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { reportError } from '@/lib/sentry';
import { useSession } from '@/hooks/useSession';
import { getLeaderboard } from '@/services/gameService';
import type { Board } from '@/types/domain';
import type { Leaderboard } from '@/types/game';
import { t } from '@/i18n';

interface UseLeaderboard {
  data: Leaderboard | null; // top rows + my rank
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** A public board for one quiz (or today's daily when the slug is null). */
export function useLeaderboard(quizSlug: string | null, board: Board, limit = 50): UseLeaderboard {
  // "Your rank" depends on who is signed in, so reload when the user changes.
  const { user, loading: authLoading } = useSession();
  const userId = user?.id ?? null;
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isActive: () => boolean): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const result = await getLeaderboard(quizSlug, board, limit);
        if (isActive()) setData(result);
      } catch (err) {
        if (!isActive()) return;
        const e = err as { message?: string };
        if (isGameError(e)) {
          setError(gameErrorMessage(e));
        } else {
          reportError(err, { area: 'leaderboard', quizSlug, board, signedIn: userId !== null });
          setError(t.errors.load.leaderboard);
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [quizSlug, board, limit, userId],
  );

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load, authLoading]);

  const refresh = useCallback((): Promise<void> => load(() => true), [load]);

  return { data, loading, error, refresh };
}
