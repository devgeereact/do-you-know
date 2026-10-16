import { useEffect, useState } from 'react';
import { reportError } from '@/lib/sentry';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { getProfile } from '@/services/profileService';
import { getDailyToday, hasFinishedDaily, londonToday } from '@/services/gameService';
import type { Quiz } from '@/types';

interface UseDailyChallenge {
  today: { date: string; quiz: Pick<Quiz, 'slug' | 'title' | 'cover_image_url'> } | null;
  playedToday: boolean;
  streak: number;
  loading: boolean;
  error: string | null;
}

/** Yesterday in London, as YYYY-MM-DD. */
function londonYesterday(): string {
  return londonToday(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

/**
 * Today's challenge (London date), whether this player has finished it, and
 * their streak. A streak only counts while the last daily was today or yesterday.
 */
export function useDailyChallenge(): UseDailyChallenge {
  const { user, loading: authLoading } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const [today, setToday] = useState<UseDailyChallenge['today']>(null);
  const [playedToday, setPlayedToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    setError(null);

    (async (): Promise<void> => {
      const daily = await getDailyToday();
      let played = false;
      let days = 0;
      if (userId) {
        const [finished, profile] = await Promise.all([
          daily ? hasFinishedDaily(userId, daily.id) : Promise.resolve(false),
          getProfile(userId),
        ]);
        played = finished;
        const last = profile?.last_daily_date ?? null;
        const alive = last === londonToday() || last === londonYesterday();
        days = alive ? (profile?.streak_current ?? 0) : 0;
      }
      if (!active) return;
      setToday(daily ? { date: daily.date, quiz: daily.quiz } : null);
      setPlayedToday(played);
      setStreak(days);
    })()
      .catch((err: unknown) => {
        if (!active) return;
        reportError(err, { area: 'daily-challenge' });
        setError("We couldn't load today's challenge. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, authLoading]);

  return { today, playedToday, streak, loading, error };
}
