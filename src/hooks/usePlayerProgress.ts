import { useCallback, useEffect, useRef, useState } from 'react';
import { getPlayerProgress, type PlayerProgress } from '@/services/progressService';
import { reportError } from '@/lib/sentry';
import { copy } from '@/lib/copy';

interface UsePlayerProgress extends PlayerProgress {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
export function usePlayerProgress(userId: string | undefined): UsePlayerProgress {
  const [data, setData] = useState<PlayerProgress>({ profile: null, attempts: [] });
  const [loading, setLoading] = useState(false);
  const [resolvedUser, setResolvedUser] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async (): Promise<void> => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setData({ profile: null, attempts: [] });
    if (!userId) {
      setResolvedUser(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getPlayerProgress(userId, controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch (cause) {
      if (!controller.signal.aborted) {
        reportError(cause, { feature: 'player-progress' });
        setError(copy.progress.error);
      }
    } finally {
      if (!controller.signal.aborted) {
        setResolvedUser(userId);
        setLoading(false);
      }
    }
  }, [userId]);
  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);
  const current = resolvedUser === userId;
  return {
    ...(current ? data : { profile: null, attempts: [] }),
    loading: loading || !current,
    error: current ? error : null,
    refresh,
  };
}
