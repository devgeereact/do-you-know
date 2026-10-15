import { useCallback, useEffect, useRef, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { getDailyChallenge, type DailyPreview } from '@/services/challengeService';
import { reportError } from '@/lib/sentry';
import { copy } from '@/lib/copy';
interface UseDailyChallenge {
  today: DailyPreview['today'];
  playedToday: boolean;
  streak: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
export function useDailyChallenge(): UseDailyChallenge {
  const { user } = useSupabaseAuth();
  const key = user?.id ?? 'public';
  const [data, setData] = useState<DailyPreview | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
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
      const result = await getDailyChallenge(controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch (cause) {
      if (!controller.signal.aborted) {
        reportError(cause, { feature: 'daily-preview' });
        setError(copy.challenge.error);
      }
    } finally {
      if (!controller.signal.aborted) {
        setResolved(key);
        setLoading(false);
      }
    }
  }, [key]);
  useEffect(() => {
    void refresh();
    const focus = (): void => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    return () => {
      request.current?.abort();
      window.removeEventListener('focus', focus);
    };
  }, [refresh]);
  const current = resolved === key;
  return {
    today: current ? (data?.today ?? null) : null,
    playedToday: current && (data?.played_today ?? false),
    streak: current ? (data?.streak ?? 0) : 0,
    loading: loading || !current,
    error: current ? error : null,
    refresh,
  };
}
