import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap, SplitText, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { burstConfetti } from '@/lib/confetti';
import { Character, Scene, WorldBackdrop, WorldGlyph } from '@/components/art/Art';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { AnswerButton, type AnswerButtonState } from '@/components/game/AnswerButton';
import { FeedbackPanel } from '@/components/game/FeedbackPanel';
import { ResultsView } from '@/components/game/ResultsView';
import { SliderAnswer } from '@/components/game/SliderAnswer';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useQuestionTimer } from '@/hooks/useQuestionTimer';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useQuizAttempt } from '@/hooks/useQuizAttempt';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { cn, isWebUrl } from '@/lib/utils';
import type { AnswerResult, AttemptSummary } from '@/types/game';
import { frameStyle, worldFor } from '@/lib/worlds';
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

  // Each new question flies in: the world settles, the frame lifts, the tab drops in, the words
  // rise, then the answers. Transform only (content is visible at rest); skipped under reduced motion.
  const stage = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!question) return;
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('[data-q-world]', { scale: 1.05, duration: 0.45 }, 0);
        tl.from('[data-q-card]', { y: 18, duration: 0.35 }, 0);
        tl.from('[data-q-tab]', { y: -14, duration: 0.3, ease: 'back.out(2.4)' }, 0.08);
        tl.from('[data-q-host]', { y: 26, duration: 0.35, ease: 'back.out(2)' }, 0.1);
        const split = SplitText.create('[data-q-prompt]', { type: 'words' });
        tl.from(split.words, { y: 10, duration: 0.22, stagger: 0.015 }, 0.06);
        tl.add(() => split.revert());
        tl.from('[data-q-answer]', { y: 10, duration: 0.22, stagger: 0.03 }, 0.1);
      });
    },
    { scope: stage, dependencies: [question?.id] },
  );

  // The verdict pops and the explanation sheet rises when the server has graded the answer.
  useGSAP(
    () => {
      if (phase !== 'feedback') return;
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.from('[data-q-verdict]', { scale: 0.85, duration: 0.3, ease: 'back.out(2.5)' });
        gsap.from('[data-stage-sheet]', { yPercent: 100, duration: 0.32, ease: 'power2.out' });
        if (lastResult?.is_correct) {
          gsap.fromTo('[data-q-host]', { y: 0 }, { y: -16, duration: 0.16, yoyo: true, repeat: 1 });
        }
      });
    },
    { scope: stage, dependencies: [phase, question?.id] },
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

  const inStage = (phase === 'question' || phase === 'feedback') && Boolean(state && question);
  const w = question ? worldFor(question) : null;
  const modeLabel = t.play.mode[mode];

  return (
    <main
      className={cn(
        'relative isolate mx-auto min-h-dvh',
        inStage ? 'overflow-hidden' : 'max-w-3xl px-4 pb-12 pt-4 md:px-8 lg:max-w-5xl',
      )}
    >
      {inStage && w && (
        <div aria-hidden="true" data-q-world className="absolute inset-0 -z-10">
          <WorldBackdrop world={w.key} />
        </div>
      )}
      <header
        className={cn(
          'flex items-center justify-between gap-3',
          inStage ? 'absolute inset-x-0 top-0 z-10 px-3 pt-3 md:px-5' : 'mb-4',
        )}
      >
        <Link
          to={leaveTo}
          className={cn(
            'inline-flex min-h-tap shrink-0 items-center gap-1 rounded-full px-3 font-semibold focus-visible:outline-none focus-visible:ring-[3px]',
            inStage
              ? 'border-[1.5px] border-white/40 bg-white/20 text-white backdrop-blur focus-visible:ring-white'
              : '-ml-2 text-primary hover:underline focus-visible:ring-primary',
          )}
        >
          <span aria-hidden="true">←</span>
          {phase === 'results' ? backLabel : t.play.leave}
        </Link>
        <p
          className={cn(
            'min-w-0 truncate font-semibold',
            inStage
              ? 'rounded-full border-[1.5px] border-white/40 bg-white/20 px-3 py-2 text-sm text-white backdrop-blur'
              : 'text-center font-display text-lg text-content',
          )}
        >
          {inStage ? (
            <>
              {modeLabel}
              <span className="hidden sm:inline">{` · ${title}`}</span>
            </>
          ) : (
            title
          )}
        </p>
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

      {inStage && state && question && w && (
        <div
          key={question.id}
          ref={stage}
          className="grid min-h-dvh place-items-stretch px-2 pb-2 pt-[5.4rem] md:place-items-center md:px-7 md:pb-7 md:pt-16"
        >
          <section
            data-q-card
            aria-label={t.play.questionOf(state.position, state.total)}
            className="stage-frame flex w-full max-w-[70rem] flex-col md:h-[min(calc(100dvh-7rem),45rem)] md:min-h-[35rem]"
            style={frameStyle(w)}
          >
            <span data-q-tab className="stage-tab">
              <WorldGlyph world={w.key} size={26} />
              {t.play.worldTab(w.name)}
            </span>
            <div
              className="stage-inner min-h-[calc(100dvh-6.4rem)] md:min-h-0"
              data-dark={w.dark && phase === 'question'}
              data-result={
                phase === 'feedback' && lastResult
                  ? lastResult.is_correct
                    ? 'right'
                    : 'wrong'
                  : undefined
              }
            >
              <Scene world={w.key} className="!h-[58%]" />
              <div className="absolute inset-x-4 top-4 z-[4] flex items-center justify-between md:inset-x-6">
                {timer.secondsLeft !== null && phase === 'question' ? (
                  <span className="stage-pill" data-low={timer.isLow} role="timer" aria-live="off">
                    {t.play.timer.badge(timer.secondsLeft)}
                  </span>
                ) : (
                  <span />
                )}
              </div>
              <div
                data-q-host
                aria-hidden="true"
                className={cn(
                  'absolute bottom-3 left-4 z-[3] transition-[filter] md:bottom-6 md:left-7',
                  phase === 'feedback' && 'blur-[3px]',
                )}
              >
                <Character
                  name={w.host}
                  size={150}
                  mood={
                    phase === 'feedback' && lastResult
                      ? lastResult.is_correct
                        ? 'happy'
                        : 'sad'
                      : 'happy'
                  }
                  className="h-24 w-24 md:h-[10.5rem] md:w-[10.5rem]"
                />
              </div>

              <div className="relative z-[2] flex flex-1 flex-col items-center justify-center px-4 pb-28 pt-16 text-center md:px-10 md:pb-10">
                <p
                  className="flex items-center gap-2.5 text-sm font-semibold tracking-wider opacity-70"
                  aria-hidden="true"
                >
                  {state.position} / {state.total}
                  <span className="flex gap-1">
                    {Array.from({ length: state.total }, (_, i) => (
                      <i
                        key={i}
                        className={cn(
                          'block h-[7px] rounded-full bg-current',
                          i + 1 === state.position ? 'w-[18px] opacity-100' : 'w-[7px] opacity-25',
                        )}
                      />
                    ))}
                  </span>
                </p>
                <span className="sr-only">{t.play.questionOf(state.position, state.total)}</span>
                {phase === 'feedback' && lastResult ? (
                  <>
                    <h2
                      ref={feedbackRef}
                      tabIndex={-1}
                      data-q-verdict
                      className="mt-3 font-display text-[2.1rem] font-extrabold uppercase leading-none focus:outline-none md:text-[3.4rem]"
                    >
                      {lastResult.timed_out
                        ? t.play.feedback.timeUp
                        : lastResult.is_correct
                          ? t.play.feedback.correct
                          : t.play.feedback.wrong}
                    </h2>
                    <p className="mb-5 mt-2 text-sm font-semibold opacity-75 [font-variant:small-caps]">
                      {lastResult.timed_out
                        ? t.play.cheerTime
                        : lastResult.is_correct
                          ? t.play.cheerRight
                          : t.play.cheerWrong}
                    </p>
                    <p className="sr-only">{question.prompt}</p>
                  </>
                ) : (
                  <h1
                    ref={promptRef}
                    tabIndex={-1}
                    data-q-prompt
                    className="mx-auto mb-6 mt-3 max-w-[22ch] text-balance font-display text-[1.6rem] font-extrabold uppercase leading-[1.08] focus:outline-none md:text-[2.4rem]"
                  >
                    {question.prompt}
                  </h1>
                )}
                {isWebUrl(question.image_url) && phase === 'question' && (
                  <img
                    src={question.image_url}
                    alt=""
                    className="mb-4 max-h-40 rounded-2xl object-cover"
                  />
                )}

                <section aria-label={t.play.answersLabel} className="flex w-full justify-center">
                  {question.type === 'slider' && question.slider ? (
                    <div data-q-answer data-q-slider className="flex w-full justify-center">
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
                    <ul
                      className={cn(
                        'grid w-full max-w-[40rem] gap-3',
                        question.type === 'boolean' ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2',
                      )}
                    >
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
                </section>

                {phase === 'question' && error && (
                  <p
                    role="alert"
                    className="mt-3 rounded-full bg-white/90 px-4 py-2 text-center font-semibold text-[#17153A]"
                  >
                    {error}
                  </p>
                )}
              </div>

              {phase === 'feedback' && lastResult && (
                <FeedbackPanel
                  result={lastResult}
                  blocked={submitting || !online}
                  reduceMotion={reduceMotion}
                  onNext={() => void game.next()}
                  quizSlug={slug}
                  questionId={question.id}
                  prompt={question.prompt}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
