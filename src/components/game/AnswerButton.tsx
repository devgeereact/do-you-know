import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * idle      — waiting for a pick
 * right     — the server said this option is correct (chosen or not)
 * wrong     — the player picked this and the server said it is wrong
 * dimmed    — answered; not chosen and not correct
 */
export type AnswerButtonState = 'idle' | 'right' | 'wrong' | 'dimmed';

interface AnswerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  state?: AnswerButtonState;
  chosen?: boolean;
  /** Optional decorative letter (A, B, C…) before the label; hidden from screen readers. */
  marker?: string;
}

const MARKERS: Record<AnswerButtonState, string> = {
  idle: 'border-surface-border bg-background text-content-muted group-hover:border-primary/40 group-hover:text-primary',
  right: 'border-correct-fg/40 bg-correct-fg/20 text-correct-fg',
  wrong: 'border-wrong-fg/40 bg-wrong-fg/20 text-wrong-fg',
  dimmed: 'border-surface-border bg-background text-content-muted',
};

const STATES: Record<AnswerButtonState, string> = {
  idle: 'border-surface-border bg-surface text-content shadow-edge-surface hover:-translate-y-0.5 hover:border-primary/40 active:translate-y-[3px] active:shadow-edge-pressed',
  right: 'border-correct bg-correct text-correct-fg motion-safe:animate-pop',
  wrong: 'border-wrong bg-wrong text-wrong-fg motion-safe:animate-shake',
  dimmed: 'border-surface-border bg-surface text-content-muted opacity-70',
};

/** Chunky pill answer button. Right/wrong is shown by colour, icon and words. */
export function AnswerButton({
  state = 'idle',
  chosen = false,
  marker,
  className,
  children,
  type = 'button',
  ...props
}: AnswerButtonProps): JSX.Element {
  return (
    <button
      type={type}
      aria-pressed={chosen}
      className={cn(
        'group flex min-h-[3.5rem] w-full touch-manipulation select-none items-center justify-between gap-3 rounded-full border-2 px-5 py-3 text-left font-display text-lg font-semibold md:min-h-[4rem] md:px-6 md:text-xl',
        'transition-[transform,box-shadow,background-color,border-color] duration-[120ms] ease-out',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-default',
        STATES[state],
        className,
      )}
      {...props}
    >
      {marker && (
        <span
          aria-hidden="true"
          className={cn(
            '-ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 font-display text-base transition-colors duration-[120ms] md:h-9 md:w-9',
            MARKERS[state],
          )}
        >
          {marker}
        </span>
      )}
      <span className="flex-1">{children}</span>
      {state === 'right' && (
        <span className="shrink-0 text-base">
          <span aria-hidden="true">✓ </span>
          {chosen ? t.play.answer.correct : t.play.answer.answer}
        </span>
      )}
      {state === 'wrong' && (
        <span className="shrink-0 text-base">
          <span aria-hidden="true">✕ </span>
          {t.play.answer.yourPick}
        </span>
      )}
    </button>
  );
}
