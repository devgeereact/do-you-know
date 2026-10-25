import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn, isWebUrl } from '@/lib/utils';
import type { AnswerResult } from '@/types/game';
import { t } from '@/i18n';

/** How long a correct answer stays on screen before moving on. Matches the `countdown` animation. */
export const AUTO_ADVANCE_MS = 2500;

interface FeedbackPanelProps {
  result: AnswerResult;
  headingRef: RefObject<HTMLHeadingElement>;
  /** True while a request is in flight or the device is offline. */
  blocked: boolean;
  /** True when the player prefers reduced motion: no automatic moving on. */
  reduceMotion: boolean;
  onNext: () => void;
}

function headline(result: AnswerResult): string {
  if (result.timed_out) return t.play.feedback.timeUp;
  return result.is_correct ? t.play.feedback.correct : t.play.feedback.wrong;
}

/**
 * The result of one graded answer: headline, a "Why?" toggle for the explanation and
 * source, and the way on. After a correct answer that is not the last question it
 * moves on by itself; "Stay here" or opening "Why?" stops that. Waiting here is never
 * counted against the player: the server stops the clock when it grades the answer.
 */
export function FeedbackPanel({
  result,
  headingRef,
  blocked,
  reduceMotion,
  onNext,
}: FeedbackPanelProps): JSX.Element {
  const hasWhy = Boolean(result.explanation) || isWebUrl(result.source_url);
  const [whyOpen, setWhyOpen] = useState(!result.is_correct);
  const [stayed, setStayed] = useState(false);
  const whyId = useId();

  // The tick or cross pops in beside the headline; text and colour carry the meaning.
  const panel = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.from('[data-feedback-icon]', {
          scale: 0.3,
          rotation: result.is_correct ? -30 : 0,
          duration: 0.5,
          ease: 'back.out(2.5)',
        });
      });
    },
    { scope: panel },
  );

  const autoAdvance =
    result.is_correct && !result.is_last && !reduceMotion && !blocked && !stayed && !whyOpen;

  // Always call the latest onNext without restarting the countdown when it changes.
  const nextRef = useRef(onNext);
  useEffect(() => {
    nextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    if (!autoAdvance) return;
    const id = window.setTimeout(() => nextRef.current(), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [autoAdvance]);

  return (
    <div
      ref={panel}
      className={cn(
        'mt-5 animate-fade-up rounded-2xl border-2 bg-surface p-5 shadow-lift',
        result.is_correct ? 'border-correct' : 'border-wrong',
      )}
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="flex items-center gap-3 font-display text-2xl font-semibold text-content focus:outline-none"
      >
        <span
          aria-hidden="true"
          data-feedback-icon
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl',
            result.is_correct ? 'bg-correct text-correct-fg' : 'bg-wrong text-wrong-fg',
          )}
        >
          {result.is_correct ? '✓' : '✕'}
        </span>
        {headline(result)}
      </h2>

      {hasWhy && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={whyOpen}
            aria-controls={whyId}
            onClick={() => setWhyOpen((open) => !open)}
            className="inline-flex min-h-tap items-center gap-2 rounded-full border-2 border-surface-border px-4 font-bold text-content transition-colors duration-[120ms] hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary"
          >
            {t.play.feedback.why}
            <span
              aria-hidden="true"
              className={cn('text-xs transition-transform duration-200', whyOpen && 'rotate-180')}
            >
              ▼
            </span>
          </button>
          <div id={whyId} hidden={!whyOpen} className="mt-3 rounded-xl bg-background p-4">
            {result.explanation && (
              <p className="leading-relaxed text-content">{result.explanation}</p>
            )}
            {isWebUrl(result.source_url) && (
              <a
                href={result.source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 inline-flex min-h-tap items-center text-sm font-semibold text-primary underline underline-offset-2"
              >
                {t.common.whereThisComesFrom}
              </a>
            )}
          </div>
        </div>
      )}

      {autoAdvance && (
        <div className="mt-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p role="status" className="text-sm font-semibold text-content-muted">
              {t.play.feedback.comingUp}
            </p>
            <div
              aria-hidden="true"
              className="mt-1 h-2 overflow-hidden rounded-full bg-surface-border"
            >
              <div className="h-full origin-left animate-countdown rounded-full bg-primary" />
            </div>
          </div>
          <Button variant="ghost" onClick={() => setStayed(true)}>
            {t.play.feedback.stay}
          </Button>
        </div>
      )}

      <Button size="lg" className="mt-5 w-full" disabled={blocked} onClick={onNext}>
        {result.is_last ? t.play.feedback.seeScore : t.play.feedback.next}
      </Button>
    </div>
  );
}
