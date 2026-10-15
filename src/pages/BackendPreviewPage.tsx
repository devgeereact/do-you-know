import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnswerButton } from '@/components/game/AnswerButton';
import { SliderAnswer } from '@/components/game/SliderAnswer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { gameErrorMessage } from '@/lib/gameErrors';
import {
  answerPreviewQuestion,
  finishPreviewQuiz,
  listPreviewQuizzes,
  nextPreviewQuestion,
  startPreviewQuiz,
  type PreviewQuiz,
} from '@/services/cpanelService';
import type { AnswerResult, AttemptState, AttemptSummary } from '@/types/game';

/** A complete practice slice against PHP, separate from the existing game routes. */
export function BackendPreviewPage(): JSX.Element {
  const [quizzes, setQuizzes] = useState<PreviewQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [summary, setSummary] = useState<AttemptSummary | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listPreviewQuizzes()
      .then((rows) => {
        if (active) setQuizzes(rows);
      })
      .catch(() => {
        if (active) setError('We couldn’t load the quizzes. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(gameErrorMessage(err instanceof Error ? err : null));
    } finally {
      setBusy(false);
    }
  };

  const start = (slug: string): void => {
    void run(async () => {
      const state = await startPreviewQuiz(slug);
      setAttempt(state);
      setFeedback(null);
      setSummary(null);
      setChosen(null);
      if (state.complete) setSummary(await finishPreviewQuiz(state.attempt_id));
    });
  };

  const answer = (choice: { option_id: string } | { value: number }): void => {
    if (!attempt) return;
    void run(async () => {
      setChosen('option_id' in choice ? choice.option_id : null);
      setFeedback(await answerPreviewQuestion(attempt.attempt_id, choice));
    });
  };

  const next = (): void => {
    if (!attempt) return;
    void run(async () => {
      if (feedback?.is_last || attempt.complete)
        setSummary(await finishPreviewQuiz(attempt.attempt_id));
      else {
        setAttempt(await nextPreviewQuestion(attempt.attempt_id));
        setFeedback(null);
        setChosen(null);
      }
    });
  };

  const question = attempt?.question;
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-content">Do You Know</h1>
        <Link
          to="/account?preview=cpanel"
          className="inline-flex min-h-tap items-center font-semibold text-primary"
        >
          Adult accounts
        </Link>
      </div>
      <p className="mt-3 text-content-muted">
        Development preview: practise a quiz. Daily games, challenges and avatars are still being
        connected.
      </p>
      <p className="mt-2 text-sm text-content-muted">
        Guest progress belongs to this browser tab. Adult accounts are not linked to these games
        yet.
      </p>
      {error && (
        <p role="alert" className="mt-5 rounded-xl border-2 border-wrong p-4 text-content">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="mt-6">
          Loading quizzes…
        </p>
      )}
      {summary ? (
        <Card className="mt-6 space-y-5">
          <h2 className="text-3xl font-semibold text-content">
            You scored {summary.correct}/{summary.total}
          </h2>
          <p className="text-content-muted">
            Thanks for playing! Every question is a chance to learn.
          </p>
          <ul className="space-y-4">
            {summary.review.map((item) => (
              <li key={item.position} className="rounded-xl bg-background p-4">
                <p className="font-semibold text-content">
                  {item.is_correct ? '✓ Correct' : '✕ Keep learning'}: {item.prompt}
                </p>
                <p className="mt-2 text-content-muted">{item.explanation}</p>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => {
              setAttempt(null);
              setSummary(null);
              setFeedback(null);
            }}
          >
            Choose another quiz
          </Button>
        </Card>
      ) : attempt ? (
        <Card className="mt-6 space-y-5">
          <p className="font-semibold text-primary">
            {attempt.quiz.title}: question {attempt.position} of {attempt.total}
          </p>
          {attempt.time_limit_seconds !== null && (
            <p className="text-sm text-content-muted">
              {attempt.time_limit_seconds} seconds per question. Answers arriving after the limit
              count as timed out.
            </p>
          )}
          {question && (
            <>
              <h2 className="text-2xl font-semibold text-content">{question.prompt}</h2>
              {question.type === 'slider' && question.slider ? (
                <SliderAnswer
                  slider={question.slider}
                  prompt={question.prompt}
                  questionKey={question.id}
                  result={feedback}
                  disabled={busy || feedback !== null}
                  onSubmit={(value) => answer({ value })}
                />
              ) : (
                <div className="space-y-3">
                  {question.options.map((option) => (
                    <AnswerButton
                      key={option.id}
                      chosen={chosen === option.id}
                      disabled={busy || feedback !== null}
                      state={
                        !feedback
                          ? 'idle'
                          : feedback.correct_option_ids.includes(option.id)
                            ? 'right'
                            : chosen === option.id
                              ? 'wrong'
                              : 'dimmed'
                      }
                      onClick={() => answer({ option_id: option.id })}
                    >
                      {option.label}
                    </AnswerButton>
                  ))}
                </div>
              )}
            </>
          )}
          {feedback && (
            <div role="status" className="space-y-3">
              <p className="text-xl font-semibold text-content">
                {feedback.timed_out
                  ? 'Time’s up. Let’s learn the answer.'
                  : feedback.is_correct
                    ? '✓ Correct!'
                    : '✕ Good try. Here’s the answer.'}
              </p>
              <p className="text-content-muted">{feedback.explanation}</p>
            </div>
          )}
          {(feedback || attempt.awaiting_next || attempt.complete) && (
            <Button disabled={busy} onClick={next}>
              {feedback?.is_last || attempt.complete ? 'See my result' : 'Next question'}
            </Button>
          )}
          {busy && <p role="status">One moment…</p>}
        </Card>
      ) : (
        !loading && (
          <div className="mt-6 grid gap-5">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="space-y-4">
                <h2 className="text-2xl font-semibold text-content">{quiz.title}</h2>
                <p className="text-content-muted">{quiz.question_count} questions</p>
                <Button disabled={busy} onClick={() => start(quiz.slug)}>
                  Play {quiz.title}
                </Button>
              </Card>
            ))}
            {quizzes.length === 0 && <p>No practice quizzes are published yet.</p>}
          </div>
        )
      )}
    </main>
  );
}
