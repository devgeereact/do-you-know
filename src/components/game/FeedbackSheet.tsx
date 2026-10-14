import { useEffect, useRef } from 'react';
import type { AnswerResult, PublicQuestion } from '@/types/game';
import { Button } from '@/components/ui/Button';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';

interface FeedbackSheetProps {
  result: AnswerResult;
  question: PublicQuestion;
  disabled: boolean;
  next: () => Promise<void>;
}
export function FeedbackSheet({
  result,
  question,
  disabled,
  next,
}: FeedbackSheetProps): JSX.Element {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, [result]);
  const answer =
    question.type === 'slider'
      ? result.correct_value
      : question.options
          .filter((option) => result.correct_option_ids.includes(option.id))
          .map((option) => option.label)
          .join(', ');
  return (
    <section className="grid gap-5" aria-labelledby="feedback-heading">
      <p className="text-base font-bold text-content-muted">
        {copy.game.position(result.position, result.total)}
      </p>
      <h1
        id="feedback-heading"
        ref={title}
        tabIndex={-1}
        className={cn(
          'rounded-xl p-4 font-display text-2xl',
          result.is_correct ? 'bg-correct text-correct-fg' : 'bg-wrong text-wrong-fg',
        )}
      >
        <span aria-hidden="true">{result.is_correct ? '✓ ' : '✕ '}</span>
        {result.timed_out
          ? copy.game.timeout
          : result.is_correct
            ? copy.game.correct
            : copy.game.wrong}
      </h1>
      <p className="font-display text-xl font-semibold text-content">{question.prompt}</p>
      <p className="text-lg text-content">
        {copy.game.correctAnswer} <strong>{answer}</strong>
      </p>
      <p className="text-lg text-content-muted">{result.explanation}</p>
      {result.source_url && (
        <a
          href={result.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-tap items-center font-bold text-primary"
        >
          {copy.game.source} ↗
        </a>
      )}
      <Button disabled={disabled} onClick={() => void next()}>
        {result.is_last ? copy.game.results : copy.game.next}
      </Button>
    </section>
  );
}
