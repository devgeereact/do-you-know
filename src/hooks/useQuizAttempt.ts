import { useCallback, useEffect, useRef, useState } from 'react';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { reportError } from '@/lib/sentry';
import { useGuestSession } from '@/hooks/useGuestSession';
import {
  answerQuestion,
  finishAttempt,
  nextQuestion,
  startAttempt,
  type StartAttemptArgs,
} from '@/services/gameService';
import type { AnswerResult, AttemptState, AttemptSummary } from '@/types/game';

export type AttemptPhase = 'loading' | 'question' | 'feedback' | 'finishing' | 'results' | 'error';

interface UseQuizAttempt {
  phase: AttemptPhase;
  state: AttemptState | null; // current question (no answers), position/total
  lastResult: AnswerResult | null; // set in 'feedback'
  summary: AttemptSummary | null; // set in 'results'
  submitting: boolean;
  error: string | null; // friendly copy
  answerOption: (optionId: string) => Promise<void>;
  answerValue: (value: number) => Promise<void>; // slider
  timeUp: () => Promise<void>; // the display timer hit zero
  next: () => Promise<void>; // next_question, or finish_attempt after the last
  restart: () => Promise<void>; // new attempt, same quiz/mode
}

// The server allows 1.5 s of network grace after the limit before it marks a
// question timed out, so wait a little longer than that before asking.
const TIME_UP_GRACE_MS = 1800;
const TIME_UP_RETRIES = 3;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function errorCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message).trim()
    : undefined;
}

/**
 * Drives one game from start to results. The server is the source of truth:
 * on mount it calls start_attempt, which resumes an open attempt (refresh-safe).
 * Nothing here holds or derives an answer before answer_question returns it.
 */
export function useQuizAttempt(args: StartAttemptArgs): UseQuizAttempt {
  const { mode, quizSlug, challengeCode } = args;
  const { ensureSession } = useGuestSession();

  const [phase, setPhase] = useState<AttemptPhase>('loading');
  const [state, setState] = useState<AttemptState | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [summary, setSummary] = useState<AttemptSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against stale async work after unmount, restart or a new question.
  const runRef = useRef(0);
  const busyRef = useRef(false);

  const fail = useCallback((err: unknown, area: string, fatal: boolean): void => {
    if (isGameError({ message: errorCode(err) })) {
      setError(gameErrorMessage({ message: errorCode(err) }));
    } else {
      reportError(err, { area: `quiz-attempt:${area}` });
      setError(gameErrorMessage(null));
    }
    if (fatal) setPhase('error');
  }, []);

  const finish = useCallback(async (attemptId: string, run: number): Promise<void> => {
    setPhase('finishing');
    const result = await finishAttempt(attemptId);
    if (run !== runRef.current) return;
    setSummary(result);
    setPhase('results');
  }, []);

  /** Moves to whatever the server says comes next for this attempt. */
  const settle = useCallback(
    async (s: AttemptState, run: number): Promise<void> => {
      if (run !== runRef.current) return;
      setState(s);
      if (s.complete) return finish(s.attempt_id, run);
      if (s.awaiting_next) {
        const shown = await nextQuestion(s.attempt_id);
        if (run !== runRef.current) return;
        setState(shown);
      }
      setLastResult(null);
      setPhase('question');
    },
    [finish],
  );

  const start = useCallback(async (): Promise<void> => {
    const run = ++runRef.current;
    busyRef.current = false;
    setPhase('loading');
    setState(null);
    setLastResult(null);
    setSummary(null);
    setSubmitting(false);
    setError(null);
    try {
      await ensureSession();
      const s = await startAttempt({ mode, quizSlug, challengeCode });
      await settle(s, run);
    } catch (err) {
      if (run === runRef.current) fail(err, 'start', true);
    }
  }, [ensureSession, mode, quizSlug, challengeCode, settle, fail]);

  useEffect(() => {
    void start();
    return () => {
      runRef.current += 1; // drop late responses after unmount
    };
  }, [start]);

  const submit = useCallback(
    async (answer: { optionId?: string; value?: number }): Promise<void> => {
      if (!state || phase !== 'question' || busyRef.current) return;
      const run = runRef.current;
      busyRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const result = await answerQuestion(state.attempt_id, answer);
        if (run !== runRef.current) return;
        setLastResult(result);
        setPhase('feedback');
      } catch (err) {
        if (run !== runRef.current) return;
        if (errorCode(err) === 'question_not_shown') {
          await settle(await nextQuestion(state.attempt_id), run).catch((e: unknown) =>
            fail(e, 'resync', true),
          );
          return;
        }
        // Rule errors (e.g. invalid_value) keep the question on screen.
        fail(err, 'answer', !isGameError({ message: errorCode(err) }));
      } finally {
        busyRef.current = false;
        if (run === runRef.current) setSubmitting(false);
      }
    },
    [state, phase, settle, fail],
  );

  const answerOption = useCallback(
    (optionId: string): Promise<void> => submit({ optionId }),
    [submit],
  );

  const answerValue = useCallback((value: number): Promise<void> => submit({ value }), [submit]);

  const timeUp = useCallback(async (): Promise<void> => {
    if (!state || phase !== 'question') return;
    const run = runRef.current;
    const { attempt_id: attemptId, position } = state;
    await wait(TIME_UP_GRACE_MS);
    for (let i = 0; i < TIME_UP_RETRIES; i += 1) {
      // Stop if the player answered, or the game moved on, while we waited.
      if (run !== runRef.current || busyRef.current) return;
      busyRef.current = true;
      setSubmitting(true);
      try {
        const result = await answerQuestion(attemptId, {});
        if (run !== runRef.current || result.position !== position) return;
        setLastResult(result);
        setPhase('feedback');
        return;
      } catch (err) {
        const code = errorCode(err);
        // invalid_option / invalid_value: not timed out on the server yet, so wait.
        if (code !== 'invalid_option' && code !== 'invalid_value') {
          if (run === runRef.current && code !== 'attempt_closed') fail(err, 'time-up', true);
          return;
        }
      } finally {
        busyRef.current = false;
        if (run === runRef.current) setSubmitting(false);
      }
      await wait(1000);
    }
  }, [state, phase, fail]);

  const next = useCallback(async (): Promise<void> => {
    if (!state || phase !== 'feedback' || busyRef.current) return;
    const run = runRef.current;
    busyRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      if (lastResult?.is_last) {
        await finish(state.attempt_id, run);
      } else {
        await settle(await nextQuestion(state.attempt_id), run);
      }
    } catch (err) {
      if (run === runRef.current) fail(err, 'next', true);
    } finally {
      busyRef.current = false;
      if (run === runRef.current) setSubmitting(false);
    }
  }, [state, phase, lastResult, finish, settle, fail]);

  return {
    phase,
    state,
    lastResult,
    summary,
    submitting,
    error,
    answerOption,
    answerValue,
    timeUp,
    next,
    restart: start,
  };
}
