import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ChallengeFriend } from '@/components/game/ChallengeFriend';
import { ResultsBoard } from '@/components/game/ResultsBoard';
import { VersusPanel } from '@/components/game/VersusPanel';
import { cn, isWebUrl } from '@/lib/utils';
import type { AttemptSummary, ReviewItem } from '@/types/game';

interface ResultsViewProps {
  summary: AttemptSummary;
  quizSlug: string;
  quizTitle: string;
  isGuest: boolean;
  restarting: boolean;
  onPlayAgain?: () => void; // omitted for the daily challenge (one play a day)
}

function cheer(correct: number, total: number): string {
  const ratio = total === 0 ? 0 : correct / total;
  if (ratio === 1) return 'Perfect score! You really do know.';
  if (ratio >= 0.7) return 'Brilliant work!';
  if (ratio >= 0.4) return 'Nice going! Have a look at the ones you missed.';
  return 'Every quiz teaches you something. Have a look at the answers below.';
}

function seconds(ms: number): string {
  return `${(ms / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} s`;
}

function answerText(value: string | number | null): string {
  if (value === null) return 'No answer';
  return typeof value === 'number' ? value.toLocaleString('en-GB') : value;
}

function ReviewRow({ item }: { item: ReviewItem }): JSX.Element {
  return (
    <li className="rounded-xl border-2 border-surface-border bg-surface p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="font-display text-lg font-semibold leading-snug text-content">
          <span className="text-content-muted">{item.position}. </span>
          {item.prompt}
        </p>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-sm font-bold',
            item.is_correct ? 'bg-correct text-correct-fg' : 'bg-wrong text-wrong-fg',
          )}
        >
          <span aria-hidden="true">{item.is_correct ? '✓ ' : '✕ '}</span>
          {item.is_correct ? 'Right' : item.timed_out ? 'Time ran out' : 'Not quite'}
        </span>
      </div>
      <dl className="grid gap-1 text-content">
        {!item.is_correct && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-content-muted">You said:</dt>
            <dd>{answerText(item.your_answer)}</dd>
          </div>
        )}
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-content-muted">Answer:</dt>
          <dd className="font-semibold">{answerText(item.correct_answer)}</dd>
        </div>
      </dl>
      {item.explanation && <p className="mt-3 text-content-muted">{item.explanation}</p>}
      {isWebUrl(item.source_url) && (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-2"
        >
          Where this comes from
        </a>
      )}
    </li>
  );
}

/** Final score and the full review. Every number here comes from finish_attempt. */
export function ResultsView({
  summary,
  quizSlug,
  quizTitle,
  isGuest,
  restarting,
  onPlayAgain,
}: ResultsViewProps): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="animate-fade-up">
      <section className="rounded-2xl border-2 border-surface-border bg-surface p-6 text-center shadow-lift">
        <p className="text-sm font-bold text-content-muted">{quizTitle}</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-5xl font-semibold text-content focus:outline-none md:text-6xl"
        >
          {summary.correct} <span className="text-content-muted">/ {summary.total}</span>
          <span className="sr-only"> correct</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-lg text-content">
          {cheer(summary.correct, summary.total)}
        </p>
        <p className="mt-1 text-sm text-content-muted">
          Answer time {seconds(summary.answer_time_ms)}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onPlayAgain && (
            <Button size="lg" onClick={onPlayAgain} disabled={restarting}>
              Play again
            </Button>
          )}
          <Link to={`/q/${quizSlug}`} className={buttonClasses('ghost', 'lg')}>
            Back to quiz
          </Link>
        </div>
        {summary.mode !== 'challenge' && (
          <ChallengeFriend
            attemptId={summary.attempt_id}
            quizTitle={quizTitle}
            correct={summary.correct}
            total={summary.total}
          />
        )}
        {isGuest && (
          <p className="mt-5 text-sm text-content-muted">
            Playing as a guest. Your games are saved on this device.{' '}
            <Link to="/me" className="font-semibold text-primary underline underline-offset-2">
              My games
            </Link>
          </p>
        )}
      </section>

      {summary.versus && (
        <VersusPanel
          versus={summary.versus}
          correct={summary.correct}
          total={summary.total}
          answerTimeMs={summary.answer_time_ms}
        />
      )}

      {(summary.mode === 'ranked' || summary.mode === 'daily') && (
        <ResultsBoard
          quizSlug={quizSlug}
          board={summary.mode === 'daily' ? 'daily' : 'all_time'}
          needsNickname={summary.needs_nickname}
        />
      )}

      <h2 className="mb-4 mt-10 text-2xl font-semibold text-content">Your answers</h2>
      <ol className="grid gap-4">
        {summary.review.map((item) => (
          <ReviewRow key={item.position} item={item} />
        ))}
      </ol>
    </div>
  );
}
