import { Link, useParams } from 'react-router-dom';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { BackLink } from '@/components/BackLink';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { sectionLinkClass } from '@/components/ui/cardClasses';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useQuiz } from '@/hooks/useQuiz';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { ageLabel, difficultyLabel } from '@/lib/quizLabels';
import { categoryStyle } from '@/lib/categoryStyle';
import { isWebUrl } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { Card } from '@/components/ui/Card';
import { WorldBanner } from '@/components/art/WorldBanner';
import { Page } from '@/components/ui/Page';
import { t } from '@/i18n';

// Mirrors Game::RANKED_ROUND on the server, which is what actually sets the round.
const RANKED_ROUND = 20;

const metaPill = 'rounded-full border border-surface-border bg-background px-3 py-1 text-content';

function TopPlayers({ slug }: { slug: string }): JSX.Element {
  const { data, error } = useLeaderboard(slug, 'all_time', 10);
  return (
    <section className="min-w-0">
      <SectionHeading
        action={
          <Link to={`/leaderboards?quiz=${slug}`} className={sectionLinkClass}>
            {t.common.fullLeaderboard}
            <span aria-hidden="true">→</span>
          </Link>
        }
      >
        {t.quiz.topPlayers}
      </SectionHeading>
      {data ? (
        <LeaderboardTable data={data} board="all_time" />
      ) : error ? (
        <p className="text-content-muted">{t.quiz.boardError}</p>
      ) : (
        <p role="status" className="text-content-muted">
          {t.common.loading}
        </p>
      )}
    </section>
  );
}

export function QuizPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const { quiz, notFound, loading, error } = useQuiz(slug);
  const { categories, curriculumTags } = useQuizCatalog();
  const category = quiz ? categories.find((c) => c.id === quiz.category_id) : undefined;

  useDocumentMeta({
    title: quiz ? (quiz.seo_title ?? quiz.title) : t.quiz.metaTitle,
    description: quiz?.seo_description ?? quiz?.intro ?? undefined,
  });

  if (notFound) return <NotFoundPage />;

  const age = quiz ? ageLabel(quiz) : null;

  return (
    <>
      <Page width="wide">
        <BackLink
          to={category ? `/c/${category.slug}` : '/'}
          label={category ? category.name : t.common.allQuizzes}
        />
        {loading && (
          <p role="status" className="py-16 text-center text-content-muted">
            {t.quiz.loading}
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
              {t.common.tryAgain}
            </button>
          </div>
        )}
        {quiz && (
          <article className="mt-2">
            <WorldBanner
              world={categoryStyle(category?.slug, category).world}
              character={categoryStyle(category?.slug, category).character}
              kicker={category?.name}
              title={quiz.title}
            />
            <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <Card className="space-y-5">
                {isWebUrl(quiz.cover_image_url) && (
                  <img
                    src={quiz.cover_image_url}
                    alt=""
                    className="aspect-[16/9] w-full rounded-xl object-cover"
                  />
                )}
                {quiz.intro && (
                  <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed text-content">
                    {quiz.intro}
                  </p>
                )}
                <ul className="flex flex-wrap gap-2 text-sm font-bold">
                  <li className={metaPill}>{t.common.questionCount(quiz.question_count)}</li>
                  {quiz.is_ranked && (
                    <li className={metaPill}>{t.common.rankedQuestionCount(RANKED_ROUND)}</li>
                  )}
                  <li className={metaPill}>{difficultyLabel(quiz.difficulty)}</li>
                  {age && <li className={metaPill}>{age}</li>}
                  <li className={metaPill}>
                    {quiz.time_limit_seconds
                      ? t.quiz.timeLimit(quiz.time_limit_seconds)
                      : t.quiz.noTimer}
                  </li>
                </ul>
                {quiz.curriculum_tags.length > 0 && (
                  <ul
                    aria-label={t.quiz.curriculumLabel}
                    className="flex flex-wrap gap-2 text-sm font-bold"
                  >
                    {quiz.curriculum_tags.map((code) => (
                      <li key={code} className="rounded-full bg-primary/10 px-3 py-1 text-content">
                        {curriculumTags.find((tag) => tag.code === code)?.label ?? code}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-3">
                  <Link to={`/play/${quiz.slug}`} className={buttonClasses('play', 'lg')}>
                    {t.quiz.playNow}
                  </Link>
                  {quiz.is_ranked && (
                    <Link
                      to={`/play/${quiz.slug}?mode=practice`}
                      className={buttonClasses('ghost', 'lg')}
                    >
                      {t.quiz.practise}
                    </Link>
                  )}
                </div>
                <p className="text-sm text-content-muted">{t.quiz.noSignUp}</p>
              </Card>
              {quiz.is_ranked && (
                <Card>
                  <TopPlayers slug={quiz.slug} />
                </Card>
              )}
            </div>
          </article>
        )}
      </Page>
    </>
  );
}
