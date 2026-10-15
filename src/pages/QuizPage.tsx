import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useQuiz } from '@/hooks/useQuiz';
import { ageLabel, difficultyLabel } from '@/lib/quizLabels';
import { isWebUrl } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function QuizPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const { quiz, notFound, loading, error } = useQuiz(slug);

  useEffect(() => {
    if (quiz) document.title = `${quiz.seo_title ?? quiz.title} · Do You Know`;
  }, [quiz]);

  if (notFound) return <NotFoundPage />;

  const age = quiz ? ageLabel(quiz) : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4 md:px-8">
        {loading && (
          <p role="status" className="py-16 text-center text-content-muted">
            Loading quiz…
          </p>
        )}
        {error && (
          <p role="alert" className="py-16 text-center text-content">
            {error}
          </p>
        )}
        {quiz && (
          <article className="animate-fade-up">
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
          </article>
        )}
      </main>
    </>
  );
}
