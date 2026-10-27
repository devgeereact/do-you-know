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
import { cn, isWebUrl } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { Card } from '@/components/ui/Card';
import { Page } from '@/components/ui/Page';
import { t } from '@/i18n';

// Mirrors Game::RANKED_ROUND on the server, which is what actually sets the round.
const RANKED_ROUND = 20;

const metaPill = 'rounded-full border border-surface-border bg-background px-3 py-1 text-content';

function TopPlayers({ slug }: { slug: string }): JSX.Element {
  const { data, error } = useLeaderboard(slug, 'all_time', 10);
  return (
    <section className="mt-12">
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
  const style = category ? categoryStyle(category.slug) : null;

  return (
    <>
      <Page>
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
          <article className="mt-3">
            <Card className="overflow-hidden p-0 shadow-lift">
              {isWebUrl(quiz.cover_image_url) && (
                <img
                  src={quiz.cover_image_url}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              )}
              <div className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  {style && !isWebUrl(quiz.cover_image_url) && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl md:h-16 md:w-16',
                        style.tile,
                      )}
                    >
                      {style.emoji}
                    </span>
                  )}
                  <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-content md:text-5xl">
                    {quiz.title}
                  </h1>
                </div>

                <ul className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
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
                    className="mt-3 flex flex-wrap gap-2 text-sm font-bold"
                  >
                    {quiz.curriculum_tags.map((code) => (
                      <li key={code} className="rounded-full bg-primary/10 px-3 py-1 text-content">
                        {curriculumTags.find((tag) => tag.code === code)?.label ?? code}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to={`/play/${quiz.slug}`} className={buttonClasses('primary', 'lg')}>
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
                <p className="mt-4 text-sm text-content-muted">{t.quiz.noSignUp}</p>
              </div>
            </Card>

            {quiz.intro && (
              <div className="mt-10 max-w-prose whitespace-pre-line text-lg leading-relaxed text-content">
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
