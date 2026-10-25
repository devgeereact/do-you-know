import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap, SplitText, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { burstConfetti } from '@/lib/confetti';
import { SkyBackdrop } from '@/components/motion/SkyBackdrop';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { AnswerButton, type AnswerButtonState } from '@/components/game/AnswerButton';
import { FeedbackPanel } from '@/components/game/FeedbackPanel';
import { ProgressDots } from '@/components/game/ProgressDots';
import { ResultsView } from '@/components/game/ResultsView';
import { SliderAnswer } from '@/components/game/SliderAnswer';
import { TimerBadge } from '@/components/game/TimerBadge';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useQuestionTimer } from '@/hooks/useQuestionTimer';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useQuizAttempt } from '@/hooks/useQuizAttempt';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { cn, isWebUrl } from '@/lib/utils';
import type { AnswerResult, AttemptSummary } from '@/types/game';
import { Card } from '@/components/ui/Card';
import { t } from '@/i18n';

function optionState(
  optionId: string,
  chosenId: string | null,
  result: AnswerResult | null,
): AnswerButtonState {
  if (!result) return 'idle';
  if (result.correct_option_ids.includes(optionId)) return 'right';
  if (optionId === chosenId) return 'wrong';
  return 'dimmed';
}

function Centered({ children }: { children: ReactNode }): JSX.Element {
  return <div className="grid min-h-[60dvh] place-items-center text-center">{children}</div>;
}

/**
 * Results plus where to go next. The catalogue loads only once the game is over,
 * so play itself makes no extra requests.
 */
function ResultsWithNext({
  summary,
  slug,
  title,
  isGuest,
  restarting,
  onPlayAgain,
}: {
  summary: AttemptSummary;
  slug: string;
  title: string;
  isGuest: boolean;
  restarting: boolean;
  onPlayAgain?: () => void;
}): JSX.Element {
  const { categories, quizzes } = useQuizCatalog();
  const current = quizzes.find((q) => q.slug === slug);
  const others = quizzes.filter((q) => q.slug !== slug);
  // Prefer the next quiz in the same category, in catalogue order, then any other.
  const sameCategory = current ? others.filter((q) => q.category_id === current.category_id) : [];
  const after = current
    ? sameCategory.find((q) => quizzes.indexOf(q) > quizzes.indexOf(current))
    : undefined;
  const next = after ?? sameCategory[0] ?? others[0] ?? null;
  const category = current ? categories.find((c) => c.id === current.category_id) : undefined;

  return (
    <ResultsView
      summary={summary}
      quizSlug={slug}
      quizTitle={title}
      isGuest={isGuest}
      restarting={restarting}
      onPlayAgain={onPlayAgain}
      nextQuiz={next ? { slug: next.slug, title: next.title } : null}
      moreTo={
        category
          ? { to: `/c/${category.slug}`, label: t.play.moreInCategory(category.name) }
          : { to: '/', label: t.common.allQuizzes }
      }
    />
  );
}

interface PlayPageProps {
  /**
   * quiz:      /play/:slug (ranked, or practice with ?mode=practice)
   * daily:     /daily/play, today's challenge, one play per day
   * challenge: /challenge/:code/play, a friend's exact questions
   */
  kind?: 'quiz' | 'daily' | 'challenge';
}

export function PlayPage({ kind = 'quiz' }: PlayPageProps): JSX.Element {
  const { slug: routeSlug = '', code = '' } = useParams<{ slug: string; code: string }>();
  const [params] = useSearchParams();
  const daily = kind === 'daily';
  const challenge = kind === 'challenge';
  const mode = kind === 'quiz' ? (params.get('mode') === 'practice' ? 'practice' : 'ranked') : kind;

  const game = useQuizAttempt({
    mode,
    quizSlug: kind === 'quiz' ? routeSlug : undefined,
    challengeCode: challenge ? code : undefined,
  });
  const { isGuest } = useGuestSession();
  const online = useOnlineStatus();
  const reduceMotion = useReducedMotion();
  const { phase, state, lastResult, summary, submitting, error, restart } = game;
  const question = state?.question ?? null;

  // The player's own pick, kept only to colour their button after grading.
  const [chosenId, setChosenId] = useState<string | null>(null);
  useEffect(() => setChosenId(null), [question?.id]);

  const timer = useQuestionTimer(
    state?.time_limit_seconds ?? null,
    phase === 'question' ? (question?.id ?? null) : null,
    () => void game.timeUp(),
    { deadline: state?.question_deadline, serverNow: state?.server_now },
  );

  const promptRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (phase === 'question') promptRef.current?.focus();
    if (phase === 'feedback') feedbackRef.current?.focus();
  }, [phase, question?.id]);

  // Each new question flies in: the prompt card lifts, its words rise, then the answers
  // stagger up. Transform and opacity only, never blocking input; skipped under reduced motion.
  const stage = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!question) return;
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('[data-q-card]', { y: 26, scale: 0.97, opacity: 0, duration: 0.45 });
        const split = SplitText.create('[data-q-prompt]', { type: 'words' });
        tl.from(split.words, { y: 14, opacity: 0, duration: 0.35, stagger: 0.025 }, '-=0.25');
        tl.add(() => split.revert());
        tl.from('[data-q-answer]', { y: 18, opacity: 0, duration: 0.35, stagger: 0.06 }, 0.15);
      });
    },
    { scope: stage, dependencies: [question?.id] },
  );

  // A right answer earns a little confetti from the button (or slider) the player used.
  useEffect(() => {
    if (phase !== 'feedback' || !lastResult?.is_correct) return;
    burstConfetti(stage.current?.querySelector('[aria-pressed="true"], [data-q-slider]'));
  }, [phase, lastResult]);

  // Coming back online after a failed start or answer: ask the server where we were.
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current && phase === 'error') void restart();
    wasOnline.current = online;
  }, [online, phase, restart]);

  const title = state?.quiz.title ?? (daily ? t.play.dailyTitle : t.play.fallbackTitle);
  const slug = state?.quiz.slug ?? routeSlug;
  const leaveTo = daily ? '/daily' : challenge ? `/challenge/${code}` : `/q/${slug}`;
  const backLabel = daily
    ? t.common.todaysChallenge
    : challenge
      ? t.play.backToChallenge
      : t.play.backToQuiz;
  useDocumentMeta({ title, noindex: true });

  return (
    <main className="relative isolate mx-auto min-h-dvh max-w-3xl px-4 pb-12 pt-4 md:px-8 lg:max-w-5xl">
      <SkyBackdrop />
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={leaveTo}
          className="-ml-2 inline-flex min-h-tap shrink-0 items-center rounded-full px-2 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
        >
          <span aria-hidden="true">←&nbsp;</span>
          {phase === 'results' ? backLabel : t.play.leave}
        </Link>
        <p className="min-w-0 truncate text-center font-display text-lg font-semibold text-content">
          {title}
        </p>
        {timer.secondsLeft !== null && phase === 'question' ? (
          <TimerBadge secondsLeft={timer.secondsLeft} isLow={timer.isLow} />
        ) : (
          <span className="min-w-tap" />
        )}
      </header>

      {!online && phase !== 'results' && (
        <p
          role="status"
          className="mb-4 rounded-2xl border-2 border-warning bg-surface p-4 text-center font-semibold text-content"
        >
          {t.play.offline}
        </p>
      )}

      {(phase === 'loading' || phase === 'finishing') && (
        <Centered>
          <p
            className="animate-fade-up font-display text-2xl font-semibold text-content"
            role="status"
          >
            {phase === 'loading' ? t.play.loading : t.play.finishing}
          </p>
        </Centered>
      )}

      {phase === 'error' && (
        <Centered>
          <div className="animate-fade-up">
            <h1 className="text-3xl font-semibold text-content">{t.play.errorTitle}</h1>
            <p className="mx-auto mb-6 mt-3 max-w-xs text-content-muted" role="alert">
              {error}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button disabled={!online} onClick={() => void game.restart()}>
                {t.common.tryAgain}
              </Button>
              {daily && (
                <Link to="/leaderboards?board=daily" className={buttonClasses('ghost')}>
                  {t.play.dailyLeaderboard}
                </Link>
              )}
              <Link to="/" className={buttonClasses('ghost')}>
                {t.play.home}
              </Link>
            </div>
          </div>
        </Centered>
      )}

      {phase === 'results' && summary && (
        <ResultsWithNext
          summary={summary}
          slug={slug}
          title={title}
          isGuest={isGuest}
          restarting={submitting}
          onPlayAgain={kind === 'quiz' ? () => void game.restart() : undefined}
        />
      )}

      {(phase === 'question' || phase === 'feedback') && state && question && (
        <div key={question.id} ref={stage} className="md:pt-[4vh]">
          <ProgressDots position={state.position} total={state.total} />

          <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8 landscape:max-lg:grid-cols-2 landscape:max-lg:items-start landscape:max-lg:gap-4">
            <Card
              as="section"
              data-q-card
              className="shadow-lift md:p-8 lg:sticky lg:top-4 landscape:max-lg:sticky landscape:max-lg:top-4"
            >
              {isWebUrl(question.image_url) && (
                <img
                  src={question.image_url}
                  alt=""
                  className="mb-4 max-h-48 w-full rounded-xl object-cover"
                />
              )}
              <h1
                ref={promptRef}
                tabIndex={-1}
                data-q-prompt
                className="text-balance font-display text-2xl font-semibold leading-snug text-content focus:outline-none md:text-4xl landscape:max-lg:text-2xl"
              >
                {question.prompt}
              </h1>
            </Card>

            <section aria-label={t.play.answersLabel}>
              {question.type === 'slider' && question.slider ? (
                <div data-q-answer data-q-slider>
                  <SliderAnswer
                    slider={question.slider}
                    prompt={question.prompt}
                    questionKey={question.id}
                    result={lastResult}
                    disabled={submitting || phase !== 'question' || !online}
                    onSubmit={(value) => void game.answerValue(value)}
                  />
                </div>
              ) : (
                <ul className={cn('grid gap-3', question.type === 'boolean' && 'grid-cols-2')}>
                  {question.options.map((option, i) => (
                    <li key={option.id} data-q-answer>
                      <AnswerButton
                        marker={
                          question.type === 'boolean' ? undefined : String.fromCharCode(65 + i)
                        }
                        state={optionState(option.id, chosenId, lastResult)}
                        chosen={option.id === chosenId}
                        disabled={submitting || phase !== 'question' || !online}
                        onClick={() => {
                          setChosenId(option.id);
                          void game.answerOption(option.id);
                        }}
                      >
                        {option.label}
                      </AnswerButton>
                    </li>
                  ))}
                </ul>
              )}

              {phase === 'question' && error && (
                <p role="alert" className="mt-3 text-center font-semibold text-content">
                  {error}
                </p>
              )}

              {phase === 'feedback' && lastResult && (
                <FeedbackPanel
                  result={lastResult}
                  headingRef={feedbackRef}
                  blocked={submitting || !online}
                  reduceMotion={reduceMotion}
                  onNext={() => void game.next()}
                />
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
