import { useCallback, useEffect, useRef, useState } from 'react';
import { createFriendChallenge, getFriendChallenge } from '@/services/challengeService';
import { env } from '@/lib/env';
import { reportError } from '@/lib/sentry';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { copy } from '@/lib/copy';
import type { FriendChallengePreview } from '@/types';
interface ChallengeLink {
  code: string;
  url: string;
}
interface UseFriendChallenge {
  preview: FriendChallengePreview | null;
  loading: boolean;
  error: string | null;
  create: (attemptId: string) => Promise<ChallengeLink | null>;
  share: (url: string, text: string) => Promise<'shared' | 'copied' | 'failed'>;
}
export function useFriendChallenge(code?: string): UseFriendChallenge {
  const [preview, setPreview] = useState<FriendChallengePreview | null>(null);
  const [loading, setLoading] = useState(Boolean(code));
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string | undefined>(undefined);
  const busy = useRef(false);
  const fail = useCallback((cause: unknown): void => {
    const fault =
      cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string'
        ? { message: cause.message }
        : undefined;
    if (!isGameError(fault)) reportError(cause, { feature: 'friend-challenge' });
    setError(isGameError(fault) ? gameErrorMessage(fault) : copy.challenge.error);
  }, []);
  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getFriendChallenge(code, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPreview(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) fail(cause);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setResolved(code);
        }
      });
    return () => controller.abort();
  }, [code, fail]);
  const create = async (attemptId: string): Promise<ChallengeLink | null> => {
    if (busy.current) return null;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await createFriendChallenge(attemptId);
      return {
        code: result.code,
        url: new URL(`/challenge/${result.code}`, env.appUrl || window.location.origin).href,
      };
    } catch (cause) {
      fail(cause);
      return null;
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };
  const share = async (url: string, text: string): Promise<'shared' | 'copied' | 'failed'> => {
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return 'shared';
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return 'failed';
    }
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      setError(copy.challenge.copyFailed);
      return 'failed';
    }
  };
  return {
    preview: resolved === code ? preview : null,
    loading: loading || (Boolean(code) && resolved !== code),
    error: code && resolved !== code ? null : error,
    create,
    share,
  };
}
