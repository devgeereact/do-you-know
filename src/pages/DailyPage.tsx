import { Link } from 'react-router-dom';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { SiteHeader } from '@/components/SiteHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { copy } from '@/lib/copy';
export function DailyPage(): JSX.Element {
  const daily = useDailyChallenge();
  const online = useOnlineStatus();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-3xl gap-6 px-4 pb-24 pt-6 md:px-8">
        <h1 className="font-display text-4xl font-semibold text-content">{copy.challenge.daily}</h1>
        <p className="text-lg text-content-muted">{copy.challenge.dailyIntro}</p>
        {daily.loading ? (
          <p role="status" className="text-content">
            {copy.challenge.loading}
          </p>
        ) : daily.error ? (
          <p role="alert" className="text-content">
            {daily.error}
          </p>
        ) : daily.today ? (
          <Card className="grid gap-5">
            <p className="text-content-muted">{daily.today.date}</p>
            <h2 className="font-display text-3xl font-semibold text-content">
              {daily.today.quiz.title}
            </h2>
            <p className="font-bold text-content">{copy.challenge.streak(daily.streak)}</p>
            {daily.playedToday ? (
              <div className="grid gap-4">
                <p role="status" className="text-content">
                  {copy.challenge.played}
                </p>
                <p className="text-content-muted">{copy.challenge.freshIntro}</p>
                {online ? (
                  <Link
                    className={buttonClasses()}
                    to={`/play/${daily.today.quiz.slug}?round=fresh`}
                  >
                    {copy.challenge.fresh}
                  </Link>
                ) : (
                  <p className="text-content">{copy.landing.offline}</p>
                )}
              </div>
            ) : online ? (
              <Link className={buttonClasses()} to={`/play/${daily.today.quiz.slug}?mode=daily`}>
                {copy.challenge.startDaily}
              </Link>
            ) : (
              <p className="text-content">{copy.landing.offline}</p>
            )}
            <Link
              to="/leaderboards?board=daily"
              className="inline-flex min-h-tap items-center font-bold text-primary"
            >
              {copy.challenge.dailyBoard} →
            </Link>
          </Card>
        ) : (
          <p className="text-content">{copy.challenge.none}</p>
        )}
        <p className="text-content-muted">{copy.challenge.deviceNote}</p>
        <Button
          variant="ghost"
          disabled={daily.loading || !online}
          onClick={() => void daily.refresh()}
        >
          {daily.error ? copy.catalog.retry : copy.challenge.refresh}
        </Button>
      </main>
    </>
  );
}
