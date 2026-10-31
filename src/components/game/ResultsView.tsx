import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ChallengeFriend } from '@/components/game/ChallengeFriend';
import { ResultsBoard } from '@/components/game/ResultsBoard';
import { ShareResult } from '@/components/game/ShareResult';
import { VersusPanel } from '@/components/game/VersusPanel';
import { cn, isWebUrl } from '@/lib/utils';
import { Scene } from '@/components/art/Art';
import type { WorldKey } from '@/lib/art';
import { frameStyle, world } from '@/lib/worlds';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { burstConfetti } from '@/lib/confetti';
import { useReveal } from '@/hooks/useReveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { AttemptSummary, ReviewItem } from '@/types/game';
import { Card } from '@/components/ui/Card';
import { t } from '@/i18n';

interface ResultsViewProps {
  summary: AttemptSummary;
  quizSlug: string;
  quizTitle: string;
  isGuest: boolean;
  restarting: boolean;
  onPlayAgain?: () => void; // omitted for the daily challenge (one play a day)
  /** Another quiz to try, picked by the play screen; null when there is none. */
  nextQuiz: { slug: string; title: string } | null;
  /** The wider list to browse: the quiz's category, or all quizzes. */
  moreTo: { to: string; label: string };
}

function NextSteps({
  nextQuiz,
  moreTo,
}: Pick<ResultsViewProps, 'nextQuiz' | 'moreTo'>): JSX.Element {
  return (
    <Card as="nav" aria-label={t.results.nextLabel} className="mt-10 text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-content">{t.results.nextTitle}</h2>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {nextQuiz && (
          <Link to={`/q/${nextQuiz.slug}`} className={buttonClasses('primary', 'lg')}>
            {t.results.nextQuizNamed(nextQuiz.title)}
          </Link>
        )}
        <Link to={moreTo.to} className={buttonClasses('ghost', 'lg')}>
          {moreTo.label}
        </Link>
      </div>
    </Card>
  );
}

const RING_RADIUS = 50;

/** Frame title: the same bands as the cheer line. */
function resultTab(correct: number, total: number): string {
  const ratio = total === 0 ? 0 : correct / total;
  if (ratio === 1) return t.results.tab.perfect;
  if (ratio >= 0.7) return t.results.tab.great;
  if (ratio >= 0.4) return t.results.tab.good;
  return t.results.tab.keepGoing;
}

/** A bright world for a strong round, a calm one otherwise. Cosmetic only. */
function resultWorld(percent: number): WorldKey {
  if (percent === 100) return 'space';
  if (percent >= 70) return 'jungle';
  if (percent >= 40) return 'ocean';
  return 'arctic';
}

function cheer(correct: number, total: number): string {
  const ratio = total === 0 ? 0 : correct / total;
  if (ratio === 1) return t.results.cheer.perfect;
  if (ratio >= 0.7) return t.results.cheer.great;
  if (ratio >= 0.4) return t.results.cheer.good;
  return t.results.cheer.keepGoing;
}

/** Whole-number percentage of the server's correct/total. Presentation only. */
function accuracy(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function answerText(value: string | number | null): string {
  if (value === null) return t.results.review.noAnswer;
  return typeof value === 'number' ? value.toLocaleString(t.locale) : value;
}

function ReviewRow({ item }: { item: ReviewItem }): JSX.Element {
  return (
    <li data-reveal className="rounded-2xl border-2 border-surface-border bg-surface p-5">
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
          {item.is_correct
            ? t.results.review.right
            : item.timed_out
              ? t.results.review.timedOut
              : t.results.review.wrong}
        </span>
      </div>
      <dl className="grid gap-1 text-content">
        {!item.is_correct && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-content-muted">{t.results.review.youSaid}</dt>
            <dd>{answerText(item.your_answer)}</dd>
          </div>
        )}
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-content-muted">{t.results.review.answer}</dt>
          <dd className="font-semibold">{answerText(item.correct_answer)}</dd>
        </div>
      </dl>
      {item.explanation && <p className="mt-3 text-content-muted">{item.explanation}</p>}
      {isWebUrl(item.source_url) && (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-1 inline-flex min-h-tap items-center text-sm font-semibold text-primary underline underline-offset-2"
        >
          {t.common.whereThisComesFrom}
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
  nextQuiz,
  moreTo,
}: ResultsViewProps): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const percent = accuracy(summary.correct, summary.total);

  // The ring fills to the score, the card pops in and a good score earns confetti.
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  useGSAP(
    () => {
      const ring = root.current?.querySelector<SVGCircleElement>('[data-score-ring]');
      const length = 2 * Math.PI * RING_RADIUS;
      const target = length * (1 - percent / 100);
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        if (ring) gsap.set(ring, { strokeDasharray: length, strokeDashoffset: target });
      });
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        const tl = gsap.timeline();
        tl.from('[data-results-card]', {
          y: 30,
          scale: 0.94,
          opacity: 0,
          duration: 0.6,
          ease: 'back.out(1.6)',
        });
        if (ring) {
          tl.fromTo(
            ring,
            { strokeDasharray: length, strokeDashoffset: length },
            { strokeDashoffset: target, duration: 1.2, ease: 'power2.out' },
            0.2,
          );
        }
        // The number in the ring counts up with the fill (decorative; the text below says it).
        const label = root.current?.querySelector<HTMLElement>('[data-ring-percent]');
        if (label) {
          const counter = { n: 0 };
          tl.to(
            counter,
            {
              n: percent,
              duration: 1.2,
              ease: 'power2.out',
              onUpdate: () => {
                label.textContent = `${Math.round(counter.n)}%`;
              },
            },
            0.2,
          );
        }
        tl.from('[data-results-rise]', { y: 16, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.5);
        if (percent >= 70) tl.add(() => burstConfetti(ring, 60), 1);
      });
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <section
        data-results-card
        className="stage-frame mx-auto mt-8 max-w-3xl"
        style={frameStyle(world(resultWorld(percent)))}
      >
        <span className="stage-tab">{resultTab(summary.correct, summary.total)}</span>
        <div className="stage-inner px-5 pb-8 pt-12 text-center md:px-10">
          <Scene world={resultWorld(percent)} className="!h-[45%] opacity-90" />
          <div className="relative z-[2]">
            <div aria-hidden="true" className="relative mx-auto mb-2 h-28 w-28 md:h-32 md:w-32">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="12"
                  className="stroke-surface-border"
                />
                <circle
                  data-score-ring
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="12"
                  strokeLinecap="round"
                  className={cn(
                    percent >= 70
                      ? 'stroke-correct'
                      : percent >= 40
                        ? 'stroke-secondary'
                        : 'stroke-primary',
                  )}
                />
              </svg>
              <span
                data-ring-percent
                className="absolute inset-0 grid place-items-center font-display text-2xl font-semibold tabular-nums text-content"
              >
                {`${percent}%`}
              </span>
            </div>
            <p className="text-sm font-bold text-content-muted">{quizTitle}</p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 text-5xl font-semibold text-content focus:outline-none md:text-6xl"
            >
              {summary.correct} <span className="text-content-muted">/ {summary.total}</span>
              <span className="sr-only"> {t.results.correctSuffix}</span>
            </h1>
            <p data-results-rise className="mx-auto mt-3 max-w-sm text-lg text-content">
              {cheer(summary.correct, summary.total)}
            </p>
            <p data-results-rise className="mt-1 text-sm font-semibold text-content">
              {t.results.accuracy(percent)}
            </p>
            <p className="mt-1 text-sm text-content-muted">
              {t.results.answerTime(t.common.seconds(summary.answer_time_ms))}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {nextQuiz && (
                <Link to={`/q/${nextQuiz.slug}`} className={buttonClasses('primary', 'lg')}>
                  {t.results.nextQuiz}
                </Link>
              )}
              {onPlayAgain && (
                <Button
                  size="lg"
                  variant={nextQuiz ? 'ghost' : 'primary'}
                  onClick={onPlayAgain}
                  disabled={restarting}
                >
                  {t.results.playAgain}
                </Button>
              )}
            </div>
            <ShareResult
              quizSlug={quizSlug}
              quizTitle={quizTitle}
              correct={summary.correct}
              total={summary.total}
            />
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
                {t.results.guestNote}{' '}
                <Link to="/me" className="font-semibold text-primary underline underline-offset-2">
                  {t.common.myGames}
                </Link>
              </p>
            )}
          </div>
        </div>
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

      <SectionHeading className="mt-12">{t.results.yourAnswers}</SectionHeading>
      <ol className="grid gap-4">
        {summary.review.map((item) => (
          <ReviewRow key={item.position} item={item} />
        ))}
      </ol>

      <NextSteps nextQuiz={nextQuiz} moreTo={moreTo} />
    </div>
  );
}
