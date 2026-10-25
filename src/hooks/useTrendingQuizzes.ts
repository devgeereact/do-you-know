import { useCallback, useEffect, useState } from 'react';
import { reportError } from '@/lib/sentry';
import { listTrendingQuizzes } from '@/services/catalogService';
import type { Quiz } from '@/types';
import { t } from '@/i18n';

interface UseTrendingQuizzes {
  quizzes: Quiz[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Up to six published quizzes played most this week (GET /quizzes/trending). Public. */
export function useTrendingQuizzes(): UseTrendingQuizzes {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isActive: () => boolean): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const list = await listTrendingQuizzes();
      if (isActive()) setQuizzes(list);
    } catch (err) {
      if (!isActive()) return;
      reportError(err, { area: 'trending-quizzes' });
      setError(t.errors.load.trending);
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = useCallback((): Promise<void> => load(() => true), [load]);

  return { quizzes, loading, error, refresh };
}
