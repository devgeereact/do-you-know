import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuizAttempt } from '@/hooks/useQuizAttempt';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { SiteHeader } from '@/components/SiteHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QuestionView } from '@/components/game/QuestionView';
import { FeedbackSheet } from '@/components/game/FeedbackSheet';
import { ResultsView } from '@/components/game/ResultsView';
import { copy } from '@/lib/copy';

export function PlayPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const requested = params.get('mode');
  const game = useQuizAttempt({
    mode:
      requested === 'ranked' || requested === 'daily' || requested === 'challenge'
        ? requested
        : 'practice',
    quizSlug: slug,
    challengeCode: params.get('challenge') ?? undefined,
  });
  const online = useOnlineStatus();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-8">
        <Card>
          {(game.phase === 'loading' || game.phase === 'finishing') && (
            <p role="status" className="text-lg text-content">
              {game.phase === 'finishing' ? copy.game.finishing : copy.game.loading}
            </p>
          )}
          {game.phase === 'error' && (
            <div className="grid gap-5">
              <p role="alert" className="text-lg text-content">
                {game.error}
              </p>
              <Button disabled={!online} onClick={() => void game.restart()}>
                {copy.game.resume}
              </Button>
              <Link to="/" className="inline-flex min-h-tap items-center font-bold text-primary">
                {copy.game.leave}
              </Link>
            </div>
          )}
          {game.phase === 'question' && game.state && (
            <QuestionView
              state={game.state}
              disabled={game.submitting || !online}
              answerOption={game.answerOption}
              answerValue={game.answerValue}
            />
          )}
          {game.phase === 'feedback' && game.lastResult && game.state?.question && (
            <FeedbackSheet
              result={game.lastResult}
              question={game.state.question}
              disabled={game.submitting || !online}
              next={game.next}
            />
          )}
          {game.phase === 'results' && game.summary && (
            <ResultsView summary={game.summary} restart={game.restart} />
          )}
        </Card>
      </main>
    </>
  );
}
