import { useEffect, useState } from 'react';
import { reportError } from '@/lib/sentry';
import { getQuiz } from '@/services/catalogService';
import type { Quiz } from '@/types';

interface UseQuiz {
  quiz: Quiz | null; // null while loading or when not published
  notFound: boolean;
  loading: boolean;
  error: string | null;
}

/** One published quiz by slug, for its landing page. Holds no questions. */
export function useQuiz(slug: string | undefined): UseQuiz {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    if (!slug) {
      setQuiz(null);
      setLoading(false);
      return;
    }
    getQuiz(slug)
      .then((q) => {
        if (active) setQuiz(q);
      })
      .catch((err: unknown) => {
        if (!active) return;
        reportError(err, { area: 'quiz', slug });
        setError("We couldn't load this quiz. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  return { quiz, notFound: !loading && !error && quiz === null, loading, error };
}
