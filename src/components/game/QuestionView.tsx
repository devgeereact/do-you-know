import { useEffect, useRef } from 'react';
import type { AttemptState } from '@/types/game';
import { useQuestionTimer } from '@/hooks/useQuestionTimer';
import { SliderAnswer } from '@/components/game/SliderAnswer';
import { Button } from '@/components/ui/Button';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';

interface QuestionViewProps {
  state: AttemptState;
  disabled: boolean;
  answerOption: (id: string) => Promise<void>;
  answerValue: (value: number) => Promise<void>;
}
export function QuestionView({
  state,
  disabled,
  answerOption,
  answerValue,
}: QuestionViewProps): JSX.Element | null {
  const question = state.question;
  const title = useRef<HTMLHeadingElement>(null);
  const timer = useQuestionTimer(state.time_limit_seconds, question?.id ?? null, undefined, {
    deadline: state.question_deadline,
    serverNow: state.server_now,
  });
  useEffect(() => {
    title.current?.focus();
  }, [question?.id]);
  if (!question) return null;
  return (
    <section className="grid gap-6" aria-labelledby="question-heading">
      <div className="flex flex-wrap justify-between gap-3 text-base font-bold text-content-muted">
        <p>{copy.game.position(state.position, state.total)}</p>
        {timer.secondsLeft !== null && (
          <p
            className={cn(
              'rounded-full bg-background px-3 py-1',
              timer.isLow && 'bg-warning text-secondary-fg',
            )}
          >
            {copy.game.countdown(timer.secondsLeft)}
          </p>
        )}
      </div>
      <p className="sr-only" role="status">
        {timer.secondsLeft === 10 || timer.secondsLeft === 5
          ? copy.game.countdown(timer.secondsLeft)
          : ''}
      </p>
      <h1
        ref={title}
        tabIndex={-1}
        id="question-heading"
        className="font-display text-3xl font-semibold leading-snug text-content md:text-4xl"
      >
        {question.prompt}
      </h1>
      {question.image_url && (
        <img
          src={question.image_url}
          alt=""
          className="mx-auto max-h-64 rounded-xl object-contain"
        />
      )}
      {timer.secondsLeft === 0 && (
        <p role="status" className="text-content">
          {copy.game.expired}
        </p>
      )}
      {question.type === 'slider' ? (
        <SliderAnswer
          key={question.id}
          question={question}
          disabled={disabled}
          onAnswer={answerValue}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => (
            <Button
              key={option.id}
              variant="ghost"
              size="lg"
              className="h-auto min-h-14 whitespace-normal py-3 text-left"
              disabled={disabled}
              onClick={() => void answerOption(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
