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

/**
 * Outlined pill answer in the game frame's colours (set by the frame's --fd). Right and wrong
 * are shown by colour, a tick or cross, and words, so colour is never the only signal.
 */
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
      data-state={state}
      className={cn(
        'stage-answer',
        state === 'right' && 'motion-safe:animate-pop',
        state === 'wrong' && 'motion-safe:animate-shake',
        className,
      )}
      {...props}
    >
      {marker && (
        <span aria-hidden="true" className="text-[0.8em] opacity-50">
          {marker}
        </span>
      )}
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
      {state === 'right' && (
        <span className="sr-only">{chosen ? t.play.answer.correct : t.play.answer.answer}</span>
      )}
      {state === 'right' && <span aria-hidden="true">✓</span>}
      {state === 'wrong' && (
        <>
          <span className="sr-only">{t.play.answer.yourPick}</span>
          <span aria-hidden="true">✕</span>
        </>
      )}
    </button>
  );
}
