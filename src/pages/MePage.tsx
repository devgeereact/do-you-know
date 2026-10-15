import { IdentitySettings } from '@/components/IdentitySettings';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { usePlayerProgress } from '@/hooks/usePlayerProgress';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { SiteHeader } from '@/components/SiteHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { copy } from '@/lib/copy';

export function MePage(): JSX.Element {
  const auth = useSupabaseAuth();
  const progress = usePlayerProgress(auth.user?.id);
  const catalog = useQuizCatalog();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-3xl gap-6 px-4 pb-24 pt-6 md:px-8">
        <h1 className="font-display text-4xl font-semibold text-content">{copy.game.profile}</h1>
        {auth.loading || progress.loading ? (
          <p role="status" className="text-content">
            {copy.progress.loading}
          </p>
        ) : !auth.user ? (
          <Card>
            <p className="mb-5 text-content">{copy.progress.noSession}</p>
            <Link to="/" className={buttonClasses()}>
              {copy.game.leave}
            </Link>
          </Card>
        ) : progress.error ? (
          <Card>
            <p role="alert" className="mb-5 text-content">
              {progress.error}
            </p>
            <Button onClick={() => void progress.refresh()}>{copy.catalog.retry}</Button>
          </Card>
        ) : (
          <>
            <Card>
              <h2 className="font-display text-2xl font-semibold text-content">
                {progress.profile?.nickname ?? copy.progress.guest}
              </h2>
              <p className="mt-3 text-content-muted">
                {auth.user.is_anonymous ? copy.progress.guestNote : copy.progress.savedNote}
              </p>
            </Card>
            <IdentitySettings key={auth.user.id} userId={auth.user.id} onSaved={progress.refresh} />
            <h2 className="font-display text-2xl font-semibold text-content">
              {copy.progress.history}
            </h2>
            {progress.attempts.length === 0 ? (
              <p className="text-content-muted">{copy.progress.empty}</p>
            ) : (
              <ol className="grid gap-4">
                {progress.attempts.map((attempt) => {
                  const quiz = catalog.quizzes.find((item) => item.id === attempt.quiz_id);
                  return (
                    <li key={attempt.id}>
                      <Card>
                        <h3 className="font-display text-xl font-semibold text-content">
                          {quiz?.title ?? copy.progress.pastQuiz}
                        </h3>
                        <p className="mt-3 text-lg font-bold text-content">
                          {attempt.correct_count}/{attempt.answered_count}
                        </p>
                        <p className="mt-1 text-base text-content-muted">
                          {attempt.finished_at
                            ? new Date(attempt.finished_at).toLocaleDateString('en-GB')
                            : ''}
                        </p>
                        {quiz && (
                          <Link
                            to={`/q/${quiz.slug}`}
                            className="mt-3 inline-flex min-h-tap items-center font-bold text-primary"
                          >
                            {copy.game.playAgain}
                          </Link>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
        <Link to="/" className="inline-flex min-h-tap items-center font-bold text-primary">
          ← {copy.game.leave}
        </Link>
      </main>
    </>
  );
}
