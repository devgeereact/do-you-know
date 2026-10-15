import { ChallengeShare } from '@/components/game/ChallengeShare';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { AttemptSummary } from '@/types/game';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { copy } from '@/lib/copy';

interface ResultsViewProps {
  summary: AttemptSummary;
  restart: () => Promise<void>;
}
export function ResultsView({ summary, restart }: ResultsViewProps): JSX.Element {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, [summary.attempt_id]);
  const seconds = Math.floor(summary.answer_time_ms / 1000);
  return (
    <section className="grid gap-6">
      <h1 ref={title} tabIndex={-1} className="font-display text-3xl font-semibold text-content">
        {copy.game.finished}
      </h1>
      <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-background p-5 text-content">
        <div>
          <dt>{copy.game.score}</dt>
          <dd className="font-display text-5xl font-semibold">
            {summary.correct}/{summary.total}
          </dd>
        </div>
        <div>
          <dt>{copy.game.answerTime}</dt>
          <dd className="font-display text-3xl font-semibold">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-3">
        {summary.mode === 'daily' && (
          <Link to="/daily" className={buttonClasses()}>
            {copy.challenge.fresh}
          </Link>
        )}
        {summary.mode !== 'daily' && (
          <Button onClick={() => void restart()}>{copy.game.playAgain}</Button>
        )}
        <Link to="/" className={buttonClasses('ghost')}>
          {copy.game.leave}
        </Link>
        <Link to="/me" className={buttonClasses('ghost')}>
          {copy.game.profile}
        </Link>
      </div>
      {summary.mode === 'daily' && (
        <p className="text-content">
          {copy.challenge.noReplay} {copy.challenge.streak(summary.streak)}
        </p>
      )}
      {summary.versus && (
        <div className="rounded-xl bg-background p-5 text-lg font-bold text-content">
          <p>
            {copy.challenge.friendScore(
              summary.versus.creator_nickname,
              summary.versus.creator_correct,
              summary.total,
            )}
          </p>
          <p>
            {summary.versus.tie
              ? copy.challenge.tie
              : summary.versus.you_won
                ? copy.challenge.won
                : copy.challenge.otherWon}
          </p>
        </div>
      )}
      {(summary.mode === 'ranked' || summary.mode === 'daily') && (
        <div className="text-content">
          {summary.ranks.all_time != null && (
            <p>
              {copy.compete.allTime}: {copy.compete.yourRank(summary.ranks.all_time)}
            </p>
          )}
          {summary.ranks.daily != null && (
            <p>
              {copy.challenge.daily}: {copy.compete.yourRank(summary.ranks.daily)}
            </p>
          )}
          {summary.needs_nickname && (
            <Link to="/me" className="inline-flex min-h-tap items-center font-bold text-primary">
              {copy.compete.choose} →
            </Link>
          )}
        </div>
      )}
      <ChallengeShare key={summary.attempt_id} attemptId={summary.attempt_id} />
      <h2 className="font-display text-2xl font-semibold text-content">{copy.game.review}</h2>
      <ol className="grid gap-5">
        {summary.review.map((item) => (
          <li
            key={item.position}
            className="rounded-xl border-2 border-surface-border p-5 text-content"
          >
            <h3 className="font-display text-xl font-semibold">
              {item.position}. {item.prompt}
            </h3>
            <p className="mt-3 font-bold">
              {item.is_correct
                ? `✓ ${copy.game.correct}`
                : `✕ ${item.timed_out ? copy.game.timeout : copy.game.wrong}`}
            </p>
            <p className="mt-2">
              {copy.game.yourAnswer} {item.your_answer ?? copy.game.noAnswer}
            </p>
            <p>
              {copy.game.correctAnswer} {item.correct_answer}
            </p>
            <p className="mt-3 text-content-muted">{item.explanation}</p>
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-tap items-center font-bold text-primary"
              >
                {copy.game.source} ↗
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
