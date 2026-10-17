import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { AnswerButton, type AnswerButtonState } from '@/components/game/AnswerButton';
import { ProgressDots } from '@/components/game/ProgressDots';
import { ResultsView } from '@/components/game/ResultsView';
import { SliderAnswer } from '@/components/game/SliderAnswer';
import { TimerBadge } from '@/components/game/TimerBadge';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useQuestionTimer } from '@/hooks/useQuestionTimer';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useQuizAttempt } from '@/hooks/useQuizAttempt';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { cn, isWebUrl } from '@/lib/utils';
import type { AnswerResult, AttemptSummary } from '@/types/game';
import { Card } from '@/components/ui/Card';

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

function headline(result: AnswerResult): string {
  if (result.timed_out) return "Time's up!";
  return result.is_correct ? 'Correct!' : 'So close!';
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
          ? { to: `/c/${category.slug}`, label: `More ${category.name} quizzes` }
          : { to: '/', label: 'All quizzes' }
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
  const { phase, state, lastResult, summary, submitting, error } = game;
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

  const title = state?.quiz.title ?? (daily ? "Today's challenge" : 'Quiz');
  const slug = state?.quiz.slug ?? routeSlug;
  const leaveTo = daily ? '/daily' : challenge ? `/challenge/${code}` : `/q/${slug}`;
  const backLabel = daily
    ? 'Today’s challenge'
    : challenge
      ? 'Back to the challenge'
      : 'Back to quiz';
  useDocumentMeta({ title, noindex: true });

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 pb-12 pt-4 md:px-8 lg:max-w-5xl">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={leaveTo}
          className="inline-flex min-h-tap items-center rounded-full px-2 font-semibold text-primary"
        >
          <span aria-hidden="true">←&nbsp;</span>
          {phase === 'results' ? backLabel : 'Leave'}
        </Link>
        <p className="truncate font-display text-lg font-semibold text-content">{title}</p>
        {timer.secondsLeft !== null && phase === 'question' ? (
          <TimerBadge secondsLeft={timer.secondsLeft} isLow={timer.isLow} />
        ) : (
          <span className="min-w-tap" />
        )}
      </header>

      {(phase === 'loading' || phase === 'finishing') && (
        <Centered>
          <p
            className="animate-fade-up font-display text-2xl font-semibold text-content"
            role="status"
          >
            {phase === 'loading' ? 'Getting your quiz ready…' : 'Adding up your score…'}
          </p>
        </Centered>
      )}

      {phase === 'error' && (
        <Centered>
          <div className="animate-fade-up">
            <h1 className="text-3xl font-semibold text-content">Uh-oh</h1>
            <p className="mx-auto mb-6 mt-3 max-w-xs text-content-muted" role="alert">
              {error}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => void game.restart()}>Try again</Button>
              {daily && (
                <Link to="/leaderboards?board=daily" className={buttonClasses('ghost')}>
                  Today's leaderboard
                </Link>
              )}
              <Link to="/" className={buttonClasses('ghost')}>
                Home
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
        <div key={question.id} className="animate-fade-up md:pt-[4vh]">
          <ProgressDots position={state.position} total={state.total} />

          <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8 landscape:max-lg:grid-cols-2 landscape:max-lg:items-start landscape:max-lg:gap-4">
            <Card
              as="section"
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
                className="text-balance font-display text-2xl font-semibold leading-snug text-content focus:outline-none md:text-4xl landscape:max-lg:text-2xl"
              >
                {question.prompt}
              </h1>
            </Card>

            <section aria-label="Answers">
              {question.type === 'slider' && question.slider ? (
                <SliderAnswer
                  slider={question.slider}
                  prompt={question.prompt}
                  questionKey={question.id}
                  result={lastResult}
                  disabled={submitting || phase !== 'question'}
                  onSubmit={(value) => void game.answerValue(value)}
                />
              ) : (
                <ul className={cn('grid gap-3', question.type === 'boolean' && 'grid-cols-2')}>
                  {question.options.map((option) => (
                    <li key={option.id}>
                      <AnswerButton
                        state={optionState(option.id, chosenId, lastResult)}
                        chosen={option.id === chosenId}
                        disabled={submitting || phase !== 'question'}
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
                <div
                  className={cn(
                    'mt-5 animate-fade-up rounded-2xl border-2 bg-surface p-5',
                    lastResult.is_correct ? 'border-correct' : 'border-wrong',
                  )}
                >
                  <h2
                    ref={feedbackRef}
                    tabIndex={-1}
                    className="flex items-center gap-3 font-display text-2xl font-semibold text-content focus:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl',
                        lastResult.is_correct
                          ? 'bg-correct text-correct-fg'
                          : 'bg-wrong text-wrong-fg',
                      )}
                    >
                      {lastResult.is_correct ? '✓' : '✕'}
                    </span>
                    {headline(lastResult)}
                  </h2>
                  {lastResult.explanation && (
                    <p className="mt-2 text-content">{lastResult.explanation}</p>
                  )}
                  {isWebUrl(lastResult.source_url) && (
                    <a
                      href={lastResult.source_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-1 inline-flex min-h-tap items-center text-sm font-semibold text-primary underline underline-offset-2"
                    >
                      Where this comes from
                    </a>
                  )}
                  <Button
                    size="lg"
                    className="mt-5 w-full"
                    disabled={submitting}
                    onClick={() => void game.next()}
                  >
                    {lastResult.is_last ? 'See my score' : 'Next question'}
                  </Button>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
