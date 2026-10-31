import { useEffect, useId, useRef, useState } from 'react';
import { ReportQuestion } from '@/components/game/ReportQuestion';
import { isWebUrl } from '@/lib/utils';
import type { AnswerResult } from '@/types/game';
import { t } from '@/i18n';

/** How long a correct answer stays on screen before moving on. Matches the `countdown` animation. */
export const AUTO_ADVANCE_MS = 2500;

interface FeedbackPanelProps {
  result: AnswerResult;
  /** True while a request is in flight or the device is offline. */
  blocked: boolean;
  /** True when the player prefers reduced motion: no automatic moving on. */
  reduceMotion: boolean;
  onNext: () => void;
  /** For the Report button. */
  quizSlug: string;
  questionId: string;
  prompt: string;
}

/**
 * The sheet that rises inside the game frame after the server grades an answer: the
 * explanation and source (behind "Why?" after a right answer), Report, and the way on.
 * After a correct answer that is not the last question it moves on by itself; "Stay here"
 * or opening "Why?" stops that. Waiting is never counted against the player: the server
 * stopped the clock when it graded the answer. The verdict itself is the heading above.
 */
export function FeedbackPanel({
  result,
  blocked,
  reduceMotion,
  onNext,
  quizSlug,
  questionId,
  prompt,
}: FeedbackPanelProps): JSX.Element {
  const hasWhy = Boolean(result.explanation) || isWebUrl(result.source_url);
  const [whyOpen, setWhyOpen] = useState(!result.is_correct);
  const [stayed, setStayed] = useState(false);
  const whyId = useId();

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
    <div data-stage-sheet className="stage-sheet">
      <span className="stage-sheet-tag">
        {whyOpen || !result.is_correct ? t.play.sheetExplain : t.play.sheetNice}
      </span>
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
        <div className="min-w-0">
          {hasWhy && !whyOpen && (
            <button
              type="button"
              aria-expanded={false}
              aria-controls={whyId}
              onClick={() => setWhyOpen(true)}
              className="inline-flex min-h-tap items-center gap-2 rounded-full border-2 border-surface-border px-4 font-bold hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
            >
              {t.play.feedback.why}
            </button>
          )}
          <div id={whyId} hidden={!whyOpen}>
            {result.explanation && (
              <p className="max-w-[70ch] leading-relaxed text-[#4A4770]">{result.explanation}</p>
            )}
            {isWebUrl(result.source_url) && (
              <a
                href={result.source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 inline-flex min-h-tap items-center text-sm font-bold text-[#6C4CF5] underline underline-offset-2"
              >
                {t.common.whereThisComesFrom}
              </a>
            )}
          </div>
          {autoAdvance && (
            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p role="status" className="text-sm font-semibold text-[#5A5680]">
                  {t.play.feedback.comingUp}
                </p>
                <div
                  aria-hidden="true"
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ECE8F6]"
                >
                  <div className="h-full origin-left animate-countdown rounded-full bg-[#1FB57A]" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStayed(true)}
                className="h-10 shrink-0 rounded-full border-2 border-surface-border px-4 text-sm font-bold"
              >
                {t.play.feedback.stay}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <ReportQuestion quizSlug={quizSlug} questionId={questionId} prompt={prompt} />
          <button
            type="button"
            disabled={blocked}
            onClick={onNext}
            className="h-12 flex-1 rounded-full bg-[var(--fd)] px-7 font-display text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_rgb(0_0_0/0.25)] transition-transform active:translate-y-[3px] disabled:opacity-50 md:flex-none"
          >
            {result.is_last ? t.play.feedback.seeScore : t.play.feedback.next}{' '}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
