import { useCallback, useEffect, useState } from 'react';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { reportError } from '@/lib/sentry';
import { shareOrCopy, type ShareOutcome } from '@/lib/share';
import { useGuestSession } from '@/hooks/useGuestSession';
import { createFriendChallenge, getFriendChallenge } from '@/services/gameService';
import type { FriendChallengePreview } from '@/types/game';

interface UseFriendChallenge {
  preview: FriendChallengePreview | null; // when a code is passed
  loading: boolean;
  error: string | null;
  create: (attemptId: string) => Promise<{ code: string; url: string } | null>;
  share: (url: string, text: string) => Promise<ShareOutcome>; // Web Share → clipboard fallback
}

/**
 * The public link for a challenge code. The app is served from one origin, so
 * the page's own origin is always right (and works locally and on previews).
 */
function challengeUrl(code: string): string {
  return `${window.location.origin}/challenge/${code}`;
}

/** Create a share link after a finished attempt, or load a preview from a code. */
export function useFriendChallenge(code?: string): UseFriendChallenge {
  const { ensureSession } = useGuestSession();
  const [preview, setPreview] = useState<FriendChallengePreview | null>(null);
  const [loading, setLoading] = useState(code !== undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let active = true;
    setLoading(true);
    setError(null);
    getFriendChallenge(code)
      .then((p) => {
        if (!active) return;
        setPreview(p);
        if (!p || p.expired) setError(gameErrorMessage({ message: 'challenge_not_found' }));
      })
      .catch((err: unknown) => {
        if (!active) return;
        reportError(err, { area: 'friend-challenge:preview' });
        setError("We couldn't load this challenge. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  const create = useCallback(
    async (attemptId: string): Promise<{ code: string; url: string } | null> => {
      setError(null);
      try {
        await ensureSession();
        const made = await createFriendChallenge(attemptId);
        return { code: made.code, url: challengeUrl(made.code) };
      } catch (err) {
        const e = err as { message?: string };
        if (isGameError(e)) {
          setError(gameErrorMessage(e));
        } else {
          reportError(err, { area: 'friend-challenge:create' });
          setError(gameErrorMessage(null));
        }
        return null;
      }
    },
    [ensureSession],
  );

  const share = useCallback(
    (url: string, text: string): Promise<ShareOutcome> => shareOrCopy(url, text),
    [],
  );

  return { preview, loading, error, create, share };
}
