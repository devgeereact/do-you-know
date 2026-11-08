import { useEffect, useState } from 'react';
import { reportError } from '@/lib/sentry';
import { useSession } from '@/hooks/useSession';
import { getProfile } from '@/services/profileService';
import { londonDaysAgo } from '@/lib/london';
import { getDailyToday, hasFinishedDaily, londonToday } from '@/services/gameService';
import type { Quiz } from '@/types';
import { t } from '@/i18n';

interface UseDailyChallenge {
  today: {
    date: string;
    quiz: Pick<Quiz, 'slug' | 'title' | 'cover_image_url'>;
    /** World of each of today's questions, in order (cosmetic; never prompts or answers). */
    stops: string[];
    stats: { played: number; average: number | null; perfect: number } | null;
  } | null;
  playedToday: boolean;
  streak: number;
  loading: boolean;
  error: string | null;
}

/** Yesterday in London, as YYYY-MM-DD. */
function londonYesterday(): string {
  return londonDaysAgo(1);
}

/**
 * Today's challenge (London date), whether this player has finished it, and
 * their streak. A streak only counts while the last daily was today or yesterday.
 * With liveMs the day's numbers refresh on that beat while the page is on screen,
 * and the whole challenge reloads when the London day turns over.
 */
export function useDailyChallenge(liveMs?: number): UseDailyChallenge {
  const { user, loading: authLoading } = useSession();
  const userId = user?.id ?? null;
  const [today, setToday] = useState<UseDailyChallenge['today']>(null);
  const [playedToday, setPlayedToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDay, setNewDay] = useState(0);

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
          daily ? hasFinishedDaily(daily.id) : Promise.resolve(false),
          getProfile(),
        ]);
        played = finished;
        const last = profile?.last_daily_date ?? null;
        const alive = last === londonToday() || last === londonYesterday();
        days = alive ? (profile?.streak_current ?? 0) : 0;
      }
      if (!active) return;
      setToday(
        daily
          ? {
              date: daily.date,
              quiz: daily.quiz,
              stops: daily.stops ?? [],
              stats: daily.stats ?? null,
            }
          : null,
      );
      setPlayedToday(played);
      setStreak(days);
    })()
      .catch((err: unknown) => {
        if (!active) return;
        reportError(err, { area: 'daily-challenge' });
        setError(t.errors.load.daily);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, authLoading, newDay]);

  const todayDate = today?.date ?? null;
  useEffect(() => {
    if (!liveMs || !todayDate) return;
    let active = true;
    const tick = (): void => {
      if (document.visibilityState !== 'visible') return;
      getDailyToday()
        .then((fresh) => {
          if (!active) return;
          if (fresh && fresh.date !== todayDate) {
            setNewDay((n) => n + 1);
          } else if (fresh?.stats) {
            const stats = fresh.stats;
            setToday((prev) => (prev ? { ...prev, stats } : prev));
          }
        })
        .catch(() => undefined); // a missed beat is fine; the last numbers stay up
    };
    const id = window.setInterval(tick, liveMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      active = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [liveMs, todayDate]);

  return { today, playedToday, streak, loading, error };
}
