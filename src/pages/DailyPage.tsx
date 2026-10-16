import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { SiteHeader } from '@/components/SiteHeader';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { isWebUrl } from '@/lib/utils';

function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/London',
  });
}

export function DailyPage(): JSX.Element {
  const { today, playedToday, streak, loading, error } = useDailyChallenge();
  const board = useLeaderboard(null, 'daily', 10);

  useEffect(() => {
    document.title = "Today's challenge · Do You Know";
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4 md:px-8">
        <p className="font-bold text-content-muted">{today ? longDate(today.date) : 'Today'}</p>
        <h1 className="text-4xl font-semibold text-content md:text-5xl">Today’s challenge</h1>
        <p className="mt-2 text-content-muted">
          Everyone gets the same questions in the same order. One go each, so make it count!
        </p>

        {loading && (
          <p role="status" className="mt-8 text-content-muted">
            Loading…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-8 text-content">
            {error}
          </p>
        )}
        {!loading && !error && !today && (
          <p className="mt-8 rounded-2xl bg-surface p-6 text-center text-content">
            Today’s challenge isn’t ready yet. Try a quiz while you wait!
          </p>
        )}

        {today && (
          <section className="mt-8 overflow-hidden rounded-2xl border-2 border-surface-border bg-surface shadow-lift">
            {isWebUrl(today.quiz.cover_image_url) ? (
              <img
                src={today.quiz.cover_image_url}
                alt=""
                className="aspect-[16/7] w-full object-cover md:aspect-[16/5]"
              />
            ) : (
              <div
                aria-hidden="true"
                className="grid aspect-[16/7] place-items-center bg-secondary md:aspect-[16/5]"
              >
                <span className="font-display text-6xl font-semibold text-secondary-fg">★</span>
              </div>
            )}
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-content">{today.quiz.title}</h2>
              <p className="mt-1 text-content-muted">
                {streak > 0 ? (
                  <>
                    Your streak: <strong className="text-content">{streak}</strong>{' '}
                    {streak === 1 ? 'day' : 'days'}
                  </>
                ) : (
                  'Play today to start a streak.'
                )}
              </p>
              <div className="mt-5">
                {playedToday ? (
                  <p className="font-semibold text-content">
                    <span aria-hidden="true">✓ </span>Done for today. Come back tomorrow!
                  </p>
                ) : (
                  <Link to="/daily/play" className={buttonClasses('primary', 'lg')}>
                    Play today’s challenge
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {today && (
          <section className="mt-10">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-2xl font-semibold text-content">Today’s top 10</h2>
              <Link
                to="/leaderboards?board=daily"
                className="text-sm font-semibold text-primary underline underline-offset-2"
              >
                Full leaderboard
              </Link>
            </div>
            {board.data && (
              <LeaderboardTable data={board.data} emptyText="No scores yet today. Be the first!" />
            )}
          </section>
        )}
      </main>
    </>
  );
}
