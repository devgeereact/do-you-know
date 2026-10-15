import { Link, useParams } from 'react-router-dom';
import { useFriendChallenge } from '@/hooks/useFriendChallenge';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { SiteHeader } from '@/components/SiteHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { copy } from '@/lib/copy';
export function FriendChallengePage(): JSX.Element {
  const { code } = useParams<{ code: string }>();
  const challenge = useFriendChallenge(code);
  const online = useOnlineStatus();
  const preview = challenge.preview;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-3xl gap-6 px-4 pb-24 pt-6 md:px-8">
        <h1 className="font-display text-4xl font-semibold text-content">
          {copy.challenge.friend}
        </h1>
        {challenge.loading ? (
          <p role="status" className="text-content">
            {copy.challenge.loading}
          </p>
        ) : challenge.error ? (
          <>
            <p role="alert" className="text-content">
              {challenge.error}
            </p>
            <Button onClick={() => window.location.reload()}>{copy.catalog.retry}</Button>
          </>
        ) : !preview || preview.expired ? (
          <p role="status" className="text-content">
            {copy.challenge.missing}
          </p>
        ) : (
          <Card className="grid gap-5">
            <h2 className="font-display text-3xl font-semibold text-content">
              {preview.quiz.title}
            </h2>
            <p className="text-xl font-bold text-content">
              {copy.challenge.friendScore(
                preview.creator.nickname,
                preview.creator_correct,
                preview.total,
              )}
            </p>
            <p className="text-content-muted">{copy.challenge.preview}</p>
            {online ? (
              <Link
                className={buttonClasses()}
                to={`/play/${preview.quiz.slug}?mode=challenge&challenge=${encodeURIComponent(preview.code)}`}
              >
                {copy.challenge.startFriend}
              </Link>
            ) : (
              <p className="text-content">{copy.landing.offline}</p>
            )}
          </Card>
        )}
        <Link to="/" className="inline-flex min-h-tap items-center font-bold text-primary">
          {copy.game.leave}
        </Link>
      </main>
    </>
  );
}
