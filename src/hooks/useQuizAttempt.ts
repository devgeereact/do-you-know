import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  startAttempt,
  nextQuestion,
  answerQuestion,
  finishAttempt,
  type StartArgs,
} from '@/services/gameService';
import { useGuestSession } from '@/hooks/useGuestSession';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { reportError } from '@/lib/sentry';
import { copy } from '@/lib/copy';
import type { AttemptState, AnswerResult, AttemptSummary } from '@/types/game';

type AttemptPhase = 'loading' | 'question' | 'feedback' | 'finishing' | 'results' | 'error';
interface Model {
  phase: AttemptPhase;
  state: AttemptState | null;
  lastResult: AnswerResult | null;
  summary: AttemptSummary | null;
  submitting: boolean;
  error: string | null;
}
interface UseQuizAttempt extends Model {
  answerOption: (optionId: string) => Promise<void>;
  answerValue: (value: number) => Promise<void>;
  next: () => Promise<void>;
  restart: () => Promise<void>;
}
const EMPTY: Model = {
  phase: 'loading',
  state: null,
  lastResult: null,
  summary: null,
  submitting: false,
  error: null,
};

export function useQuizAttempt({
  mode,
  quizSlug,
  challengeCode,
  freshDaily,
}: StartArgs): UseQuizAttempt {
  const [model, patch] = useReducer(
    (state: Model, change: Partial<Model>): Model => ({ ...state, ...change }),
    EMPTY,
  );
  const { ensureSession } = useGuestSession();
  const epoch = useRef(0);
  const busy = useRef(false);

  const fail = useCallback((cause: unknown): void => {
    const error =
      cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string'
        ? { message: cause.message }
        : undefined;
    if (!isGameError(error)) reportError(cause, { feature: 'quiz-attempt' });
    patch({
      phase: 'error',
      submitting: false,
      error: isGameError(error) ? gameErrorMessage(error) : copy.game.recovery,
    });
  }, []);

  const load = useCallback(async (): Promise<void> => {
    const version = ++epoch.current;
    busy.current = true;
    patch(EMPTY);
    try {
      if (!navigator.onLine) throw new Error('offline');
      await ensureSession();
      const state = await startAttempt({ mode, quizSlug, challengeCode, freshDaily });
      if (version !== epoch.current) return;
      if (state.complete) {
        patch({ phase: 'finishing', state });
        const summary = await finishAttempt(state.attempt_id);
        if (version === epoch.current) patch({ phase: 'results', summary });
      } else {
        const shown = state.awaiting_next ? await nextQuestion(state.attempt_id) : state;
        if (version === epoch.current) patch({ phase: 'question', state: shown });
      }
    } catch (cause) {
      if (version === epoch.current) fail(cause);
    } finally {
      if (version === epoch.current) busy.current = false;
    }
  }, [mode, quizSlug, challengeCode, freshDaily, ensureSession, fail]);

  const cancel = useCallback((): void => {
    epoch.current += 1;
  }, []);
  useEffect(() => {
    void load();
    return cancel;
  }, [load, cancel]);

  const answer = async (option: string | null, value: number | null): Promise<void> => {
    if (busy.current || model.phase !== 'question' || !model.state) return;
    busy.current = true;
    const version = epoch.current;
    patch({ submitting: true, error: null });
    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await answerQuestion(model.state.attempt_id, option, value);
      if (version === epoch.current)
        patch({ phase: 'feedback', lastResult: result, submitting: false });
    } catch (cause) {
      if (version === epoch.current) fail(cause);
    } finally {
      if (version === epoch.current) busy.current = false;
    }
  };
  const next = async (): Promise<void> => {
    if (busy.current || model.phase !== 'feedback' || !model.state || !model.lastResult) return;
    busy.current = true;
    const version = epoch.current;
    patch({ submitting: true });
    try {
      if (!navigator.onLine) throw new Error('offline');
      if (model.lastResult.is_last) {
        patch({ phase: 'finishing' });
        const summary = await finishAttempt(model.state.attempt_id);
        if (version === epoch.current) patch({ phase: 'results', summary, submitting: false });
      } else {
        const state = await nextQuestion(model.state.attempt_id);
        if (version === epoch.current)
          patch({ phase: 'question', state, lastResult: null, submitting: false });
      }
    } catch (cause) {
      if (version === epoch.current) fail(cause);
    } finally {
      if (version === epoch.current) busy.current = false;
    }
  };
  return {
    ...model,
    answerOption: (id) => answer(id, null),
    answerValue: (value) => answer(null, value),
    next,
    restart: async (): Promise<void> => {
      if (busy.current) return;
      // Finishing is idempotent. Recover a lost finish response using the same
      // attempt instead of start_attempt, which could open a fresh game.
      if (
        model.phase === 'error' &&
        model.state &&
        (model.state.complete || model.lastResult?.is_last)
      ) {
        busy.current = true;
        const version = epoch.current;
        patch({ phase: 'finishing' });
        try {
          const summary = await finishAttempt(model.state.attempt_id);
          if (version === epoch.current) patch({ phase: 'results', summary, error: null });
        } catch (cause) {
          if (version === epoch.current) fail(cause);
        } finally {
          if (version === epoch.current) busy.current = false;
        }
      } else await load();
    },
  };
}
