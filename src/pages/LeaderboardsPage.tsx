import { Link, useSearchParams } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CatalogStatus } from '@/components/CatalogStatus';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { copy } from '@/lib/copy';

export function LeaderboardsPage(): JSX.Element {
  const catalog = useQuizCatalog();
  const [params, setParams] = useSearchParams();
  const slug = params.get('quiz') ?? catalog.quizzes[0]?.slug ?? '';
  const requested = params.get('board');
  const board = requested === 'weekly' || requested === 'daily' ? requested : 'all_time';
  const quiz = catalog.quizzes.find((item) => item.slug === slug);
  const scores = useLeaderboard(board === 'daily' ? null : (quiz?.slug ?? null), board);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-4xl gap-6 px-4 pb-24 pt-6 md:px-8">
        <h1 className="font-display text-4xl font-semibold text-content">{copy.compete.heading}</h1>
        <p className="text-lg text-content-muted">{copy.compete.intro}</p>
        <CatalogStatus {...catalog} />
        {!catalog.loading && !catalog.error && (
          <>
            {catalog.quizzes.length === 0 ? (
              <p className="text-content">{copy.compete.noQuizzes}</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {board !== 'daily' && (
                    <label className="grid gap-2 font-bold text-content">
                      {copy.compete.quiz}
                      <select
                        value={quiz?.slug ?? ''}
                        onChange={(event) => setParams({ quiz: event.target.value, board })}
                        className="min-h-tap w-full min-w-0 rounded-xl border-2 border-surface-border bg-surface px-4 text-base text-content"
                      >
                        {!quiz && <option value="">{copy.compete.quiz}</option>}
                        {catalog.quizzes.map((item) => (
                          <option key={item.id} value={item.slug}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="grid gap-2 font-bold text-content">
                    {copy.compete.period}
                    <select
                      value={board}
                      onChange={(event) => setParams({ quiz: slug, board: event.target.value })}
                      className="min-h-tap rounded-xl border-2 border-surface-border bg-surface px-4 text-base text-content"
                    >
                      <option value="all_time">{copy.compete.allTime}</option>
                      <option value="weekly">{copy.compete.weekly}</option>
                      <option value="daily">{copy.challenge.dailyBoard}</option>
                    </select>
                  </label>
                </div>
                {scores.loading ? (
                  <p role="status" className="text-content">
                    {copy.compete.loading}
                  </p>
                ) : scores.error ? (
                  <Card>
                    <p role="alert" className="mb-4 text-content">
                      {scores.error}
                    </p>
                    <Button onClick={() => void scores.refresh()}>{copy.catalog.retry}</Button>
                  </Card>
                ) : (
                  <>
                    {scores.data?.me && (
                      <Card>
                        <h2 className="font-display text-xl font-semibold text-content">
                          {copy.compete.me}
                        </h2>
                        <p className="mt-3 text-content">
                          {scores.data.me.correct}/{scores.data.me.total}
                        </p>
                        <p className="text-content-muted">
                          {scores.data.me.rank === null
                            ? copy.compete.rankedNote
                            : copy.compete.yourRank(scores.data.me.rank)}
                        </p>
                      </Card>
                    )}
                    {scores.data?.top.length ? (
                      <ol className="grid gap-3" aria-label={copy.compete.heading}>
                        {scores.data.top.map((row, index) => {
                          const seconds = Math.floor(row.answer_time_ms / 1000);
                          return (
                            <li key={`${row.nickname}:${row.achieved_at}:${index}`}>
                              <Card className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4">
                                <span
                                  aria-label={`${copy.compete.rank} ${row.rank}`}
                                  className="font-display text-2xl font-semibold text-primary"
                                >
                                  {row.rank}
                                </span>
                                <div className="min-w-0">
                                  <p className="break-words font-bold text-content">
                                    {row.nickname}
                                    {row.is_me ? ` (${copy.compete.you})` : ''}
                                  </p>
                                  <p className="text-content-muted">
                                    {copy.compete.time}: {Math.floor(seconds / 60)}:
                                    {String(seconds % 60).padStart(2, '0')}
                                  </p>
                                </div>
                                <p
                                  aria-label={copy.compete.score}
                                  className="font-display text-2xl font-semibold text-content"
                                >
                                  {row.correct}/{row.total}
                                </p>
                              </Card>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="text-content">{copy.compete.empty}</p>
                    )}
                  </>
                )}
                {quiz && (
                  <Link
                    to={`/q/${quiz.slug}`}
                    className="inline-flex min-h-tap items-center font-bold text-primary"
                  >
                    {copy.catalog.explore} →
                  </Link>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
