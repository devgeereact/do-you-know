import { useEffect, useState } from 'react';
import { reportError } from '@/lib/sentry';
import { useSession } from '@/hooks/useSession';
import { listContinuePlaying } from '@/services/gameService';
import type { ContinueItem } from '@/types';
import { t } from '@/i18n';

interface UseContinuePlaying {
  items: ContinueItem[];
  loading: boolean;
  error: string | null;
}

/** Where a resumable game picks up again. The server resumes the same attempt. */
export function resumePath(item: ContinueItem): string {
  if (item.mode === 'daily') return '/daily/play';
  if (item.mode === 'challenge' && item.challengeCode) {
    return `/challenge/${encodeURIComponent(item.challengeCode)}/play`;
  }
  const slug = encodeURIComponent(item.quiz.slug);
  return item.mode === 'practice' ? `/play/${slug}?mode=practice` : `/play/${slug}`;
}

/** The player's own unfinished games (GET /me/continue). Empty without a session. */
export function useContinuePlaying(): UseContinuePlaying {
  const { user, loading: authLoading } = useSession();
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // No session yet: nothing has been started on this device.
      setItems([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    listContinuePlaying()
      .then((list) => {
        if (active) setItems(list);
      })
      .catch((err: unknown) => {
        if (!active) return;
        reportError(err, { area: 'continue-playing' });
        setError(t.errors.load.continuePlaying);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return { items, loading, error };
}
