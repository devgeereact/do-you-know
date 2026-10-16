import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useFriendChallenge } from '@/hooks/useFriendChallenge';
import { AvatarBadge } from '@/components/AvatarBadge';

/** A friend's challenge: nickname and score only, then the exact same questions. */
export function ChallengePage(): JSX.Element {
  const { code = '' } = useParams<{ code: string }>();
  const { preview, loading, error } = useFriendChallenge(code);

  useEffect(() => {
    document.title = 'Can you beat your friend? · Do You Know';
  }, []);

  const usable = preview !== null && !preview.expired;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6 text-center md:px-8">
        {loading && (
          <p role="status" className="py-16 text-content-muted">
            Loading the challenge…
          </p>
        )}

        {!loading && !usable && (
          <div className="py-10">
            <h1 className="text-3xl font-semibold text-content">Challenge not found</h1>
            <p role="alert" className="mx-auto mb-6 mt-3 max-w-xs text-content-muted">
              {error ?? 'This challenge link has expired or doesn’t exist.'}
            </p>
            <Link to="/" className={buttonClasses('primary')}>
              Find a quiz
            </Link>
          </div>
        )}

        {usable && (
          <article className="animate-fade-up rounded-2xl border-2 border-surface-border bg-surface p-6 shadow-lift md:p-8">
            <div className="flex justify-center">
              <AvatarBadge
                avatarId={preview.creator.avatar_id}
                nickname={preview.creator.nickname}
                size="lg"
              />
            </div>
            <p className="mt-4 font-bold text-content-muted">{preview.quiz.title}</p>
            <h1 className="mt-1 text-balance text-3xl font-semibold text-content md:text-4xl">
              {preview.creator.nickname} scored {preview.creator_correct}/{preview.total}.
              <span className="block text-primary">Can you beat it?</span>
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-content-muted">
              You’ll get the exact same questions in the same order. No sign-up needed.
            </p>
            <Link
              to={`/challenge/${preview.code}/play`}
              className={buttonClasses('primary', 'lg', 'mt-6')}
            >
              Accept the challenge
            </Link>
          </article>
        )}
      </main>
    </>
  );
}
