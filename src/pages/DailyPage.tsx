import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { sectionLinkClass } from '@/components/ui/cardClasses';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { isWebUrl } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Page } from '@/components/ui/Page';
import { t } from '@/i18n';

function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(t.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/London',
  });
}

export function DailyPage(): JSX.Element {
  const { today, playedToday, streak, loading, error } = useDailyChallenge();
  const board = useLeaderboard(null, 'daily', 10);

  useDocumentMeta({
    title: t.common.todaysChallenge,
    description: t.daily.metaDescription,
  });

  // The banner's sunburst turns slowly and the star settles in once today's quiz arrives.
  const root = useRef<HTMLDivElement>(null);
  const hasToday = Boolean(today);
  useGSAP(
    () => {
      if (!hasToday) return;
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.to('[data-daily-burst]', { rotation: 360, duration: 60, ease: 'none', repeat: -1 });
        gsap.from('[data-daily-star]', {
          scale: 0.6,
          rotation: -20,
          opacity: 0,
          duration: 0.7,
          ease: 'back.out(2)',
        });
      });
    },
    { scope: root, dependencies: [hasToday] },
  );

  return (
    <div ref={root}>
      <Page>
        <PageHeader
          eyebrow={today ? longDate(today.date) : t.daily.today}
          title={t.common.todaysChallenge}
          lead={t.daily.lead}
        />

        {loading && (
          <p role="status" className="text-content-muted">
            {t.common.loading}
          </p>
        )}
        {error && (
          <p role="alert" className="text-content">
            {error}
          </p>
        )}
        {!loading && !error && !today && (
          <Card className="text-center">
            <p className="text-content">{t.daily.notReady}</p>
            <Link to="/" className={buttonClasses('primary', 'md', 'mt-4')}>
              {t.daily.tryAQuiz}
            </Link>
          </Card>
        )}

        {today && (
          <Card as="section" className="overflow-hidden p-0 shadow-lift">
            {isWebUrl(today.quiz.cover_image_url) ? (
              <img
                src={today.quiz.cover_image_url}
                alt=""
                className="aspect-[16/7] w-full object-cover md:aspect-[16/5]"
              />
            ) : (
              <div
                aria-hidden="true"
                className="relative grid aspect-[16/7] place-items-center overflow-hidden bg-secondary md:aspect-[16/5]"
              >
                <div className="absolute inset-0 grid place-items-center">
                  <svg
                    data-daily-burst
                    viewBox="0 0 200 200"
                    className="aspect-square h-[160%] text-surface/30"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <path
                        key={i}
                        d="M100 100 L92 0 L108 0 Z"
                        className="fill-current"
                        transform={`rotate(${i * 30} 100 100)`}
                      />
                    ))}
                  </svg>
                </div>
                <span
                  data-daily-star
                  className="relative grid h-24 w-24 place-items-center rounded-full bg-surface font-display text-6xl font-semibold text-secondary-fg shadow-edge-sun"
                >
                  ★
                </span>
              </div>
            )}
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-content md:text-3xl">
                {today.quiz.title}
              </h2>
              <p className="mt-1 text-content-muted">
                {streak > 0 ? (
                  <>
                    {t.daily.yourStreak} <strong className="text-content">{streak}</strong>{' '}
                    {t.daily.dayUnit(streak)}
                  </>
                ) : (
                  t.daily.startStreak
                )}
              </p>
              <div className="mt-5">
                {playedToday ? (
                  <p className="inline-flex items-center gap-2 rounded-full bg-correct/10 px-4 py-2 font-semibold text-content">
                    <span aria-hidden="true" className="text-correct">
                      ✓
                    </span>
                    {t.daily.done}
                  </p>
                ) : (
                  <Link to="/daily/play" className={buttonClasses('primary', 'lg')}>
                    {t.daily.play}
                  </Link>
                )}
              </div>
            </div>
          </Card>
        )}

        {today && (
          <section className="mt-12">
            <SectionHeading
              action={
                <Link to="/leaderboards?board=daily" className={sectionLinkClass}>
                  {t.common.fullLeaderboard}
                  <span aria-hidden="true">→</span>
                </Link>
              }
            >
              {t.daily.topTen}
            </SectionHeading>
            {board.data ? (
              <LeaderboardTable data={board.data} board="daily" emptyText={t.daily.boardEmpty} />
            ) : board.error ? (
              <p className="text-content-muted">{t.daily.boardError}</p>
            ) : (
              <p role="status" className="text-content-muted">
                {t.common.loading}
              </p>
            )}
          </section>
        )}
      </Page>
    </div>
  );
}
