import { useEffect, useState } from 'react';
import { reportError } from '@/lib/sentry';
import { useSession } from '@/hooks/useSession';
import { getProfile } from '@/services/profileService';
import { listMyGames, type GameHistoryItem } from '@/services/gameService';

interface UseMyGames {
  games: GameHistoryItem[];
  streak: { current: number; best: number };
  loading: boolean;
  error: string | null;
}

/** The current player's finished games and daily streak, for /me. */
export function useMyGames(): UseMyGames {
  const { user, loading: authLoading } = useSession();
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // No session yet: nothing played on this device.
      setGames([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([listMyGames(), getProfile()])
      .then(([list, profile]) => {
        if (!active) return;
        setGames(list);
        setStreak({ current: profile?.streak_current ?? 0, best: profile?.streak_best ?? 0 });
      })
      .catch((err: unknown) => {
        if (!active) return;
        reportError(err, { area: 'my-games' });
        setError("We couldn't load your games. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return { games, streak, loading, error };
}
