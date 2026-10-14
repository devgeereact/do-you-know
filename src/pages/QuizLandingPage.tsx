import { copy } from '@/lib/copy';
import { Link, useParams } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { CatalogStatus } from '@/components/CatalogStatus';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function QuizLandingPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const catalog = useQuizCatalog();
  const online = useOnlineStatus();
  const quiz = catalog.quizzes.find((item) => item.slug === slug);
  const category = catalog.categories.find((item) => item.id === quiz?.category_id);
  if (!catalog.loading && !catalog.error && !quiz) return <NotFoundPage />;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-8">
        <Link
          to={category ? `/c/${category.slug}` : '/'}
          className="inline-flex min-h-tap items-center font-bold text-primary"
        >
          ← {category?.name ?? copy.catalog.allQuizzes}
        </Link>
        <CatalogStatus {...catalog} />
        {!catalog.loading && !catalog.error && quiz && (
          <Card className="mt-5 p-6 md:p-10">
            <p className="font-bold text-primary">
              {category?.name ?? copy.landing.fallbackCategory}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-content md:text-5xl">
              {quiz.title}
            </h1>
            <p className="mt-5 text-lg text-content-muted">{quiz.intro}</p>
            <dl className="mt-7 grid grid-cols-2 gap-5 text-content sm:grid-cols-3">
              <div>
                <dt className="text-content-muted">{copy.landing.questions}</dt>
                <dd className="mt-1 text-xl font-bold">{quiz.question_count}</dd>
              </div>
              <div>
                <dt className="text-content-muted">{copy.landing.difficulty}</dt>
                <dd className="mt-1 text-xl font-bold capitalize">{quiz.difficulty}</dd>
              </div>
              <div>
                <dt className="text-content-muted">{copy.landing.timer}</dt>
                <dd className="mt-1 text-xl font-bold">
                  {quiz.time_limit_seconds
                    ? copy.landing.timeLimit(quiz.time_limit_seconds)
                    : copy.landing.untimed}
                </dd>
              </div>
            </dl>
            {quiz.curriculum_tags.length > 0 && (
              <p className="mt-6 text-base text-content-muted">
                {copy.landing.curriculum}{' '}
                {quiz.curriculum_tags
                  .map(
                    (code) =>
                      catalog.curriculumTags.find((tag) => tag.code === code)?.label ?? code,
                  )
                  .join(', ')}
              </p>
            )}
            <div className="mt-8 border-t-2 border-surface-border pt-6">
              <Button disabled size="lg">
                {copy.landing.play}
              </Button>
              <p role="status" className="mt-4 text-base text-content-muted">
                {online ? copy.landing.pending : copy.landing.offline}
              </p>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
