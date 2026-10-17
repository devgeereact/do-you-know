import { useEffect, useState } from 'react';
import { reportError } from '@/lib/sentry';
import { useSession } from '@/hooks/useSession';
import { listMyBestScores } from '@/services/gameService';
import type { BestScore } from '@/types';

interface UseBestScores {
  scores: BestScore[];
  loading: boolean;
  error: string | null;
}

/** The player's best server-graded result per quiz (GET /me/best). Empty without a session. */
export function useBestScores(): UseBestScores {
  const { user, loading: authLoading } = useSession();
  const [scores, setScores] = useState<BestScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setScores([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    listMyBestScores()
      .then((list) => {
        if (active) setScores(list);
      })
      .catch((err: unknown) => {
        if (!active) return;
        reportError(err, { area: 'best-scores' });
        setError("We couldn't load your best scores. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return { scores, loading, error };
}
