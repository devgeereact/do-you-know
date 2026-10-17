import { Link, useParams } from 'react-router-dom';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { BackLink } from '@/components/BackLink';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useQuiz } from '@/hooks/useQuiz';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { ageLabel, difficultyLabel } from '@/lib/quizLabels';
import { isWebUrl } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { Page } from '@/components/ui/Page';

function TopPlayers({ slug }: { slug: string }): JSX.Element {
  const { data, error } = useLeaderboard(slug, 'all_time', 10);
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold text-content">Top players</h2>
        <Link
          to={`/leaderboards?quiz=${slug}`}
          className="inline-flex min-h-tap items-center text-sm font-semibold text-primary underline underline-offset-2"
        >
          Full leaderboard
        </Link>
      </div>
      {data ? (
        <LeaderboardTable data={data} />
      ) : error ? (
        <p className="text-content-muted">
          The leaderboard isn’t loading right now. Try again later.
        </p>
      ) : (
        <p role="status" className="text-content-muted">
          Loading…
        </p>
      )}
    </section>
  );
}

export function QuizPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const { quiz, notFound, loading, error } = useQuiz(slug);
  const { categories } = useQuizCatalog();
  const category = quiz ? categories.find((c) => c.id === quiz.category_id) : undefined;

  useDocumentMeta({
    title: quiz ? (quiz.seo_title ?? quiz.title) : 'Quiz',
    description: quiz?.seo_description ?? quiz?.intro ?? undefined,
  });

  if (notFound) return <NotFoundPage />;

  const age = quiz ? ageLabel(quiz) : null;

  return (
    <>
      <Page>
        <BackLink
          to={category ? `/c/${category.slug}` : '/'}
          label={category ? category.name : 'All quizzes'}
        />
        {loading && (
          <p role="status" className="py-16 text-center text-content-muted">
            Loading quiz…
          </p>
        )}
        {error && (
          <div role="alert" className="py-16 text-center">
            <p className="text-content">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={buttonClasses('ghost', 'md', 'mt-4')}
            >
              Try again
            </button>
          </div>
        )}
        {quiz && (
          <article className="mt-2 animate-fade-up">
            {isWebUrl(quiz.cover_image_url) && (
              <img
                src={quiz.cover_image_url}
                alt=""
                className="mb-6 aspect-[16/9] w-full rounded-2xl object-cover"
              />
            )}
            <h1 className="text-balance text-4xl font-semibold leading-tight text-content md:text-5xl">
              {quiz.title}
            </h1>

            <ul className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
              <li className="rounded-full bg-surface px-3 py-1 text-content">
                {quiz.question_count} questions
              </li>
              <li className="rounded-full bg-surface px-3 py-1 text-content">
                {difficultyLabel(quiz.difficulty)}
              </li>
              {age && <li className="rounded-full bg-surface px-3 py-1 text-content">{age}</li>}
              <li className="rounded-full bg-surface px-3 py-1 text-content">
                {quiz.time_limit_seconds
                  ? `${quiz.time_limit_seconds} seconds a question`
                  : 'No timer'}
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/play/${quiz.slug}`} className={buttonClasses('primary', 'lg')}>
                Play now
              </Link>
              {quiz.is_ranked && (
                <Link
                  to={`/play/${quiz.slug}?mode=practice`}
                  className={buttonClasses('ghost', 'lg')}
                >
                  Just practise
                </Link>
              )}
            </div>
            <p className="mt-3 text-sm text-content-muted">
              No sign-up needed. You’ll see the answer and why after every question.
            </p>

            {quiz.intro && (
              <div className="mt-10 max-w-prose whitespace-pre-line text-lg text-content">
                {quiz.intro}
              </div>
            )}

            {quiz.is_ranked && <TopPlayers slug={quiz.slug} />}
          </article>
        )}
      </Page>
    </>
  );
}
