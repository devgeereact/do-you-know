import { copy } from '@/lib/copy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getQuizCatalog, type CatalogFilters, type QuizCatalog } from '@/services/catalogService';
import { reportError } from '@/lib/sentry';

interface UseQuizCatalog extends QuizCatalog {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useQuizCatalog(filters: CatalogFilters = {}): UseQuizCatalog {
  const { categorySlug, age, curriculumTag, search } = filters;
  const filterKey = JSON.stringify([categorySlug, age, curriculumTag, search]);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<QuizCatalog>({
    categories: [],
    quizzes: [],
    curriculumTags: [],
  });
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
      const data = await getQuizCatalog(
        { categorySlug, age, curriculumTag, search },
        controller.signal,
      );
      if (!controller.signal.aborted) setCatalog(data);
    } catch (cause) {
      if (!controller.signal.aborted) {
        reportError(cause, { feature: 'quiz-catalogue' });
        setError(copy.catalog.error);
      }
    } finally {
      if (!controller.signal.aborted) {
        setResolvedKey(filterKey);
        setLoading(false);
      }
    }
  }, [categorySlug, age, curriculumTag, search, filterKey]);

  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);

  return { ...catalog, loading: loading || resolvedKey !== filterKey, error, refresh };
}
