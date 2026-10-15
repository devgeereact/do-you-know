import { supabase } from '@/lib/supabase';
import type { AttemptMode } from '@/types/database.types';
import type { AnswerResult, AttemptState, AttemptSummary } from '@/types/game';

/**
 * Thin wrappers over the game RPCs in supabase/migrations/0003_game_functions.sql.
 * The server grades, times and scores everything; these calls only pass the
 * player's choice through and return what the server says. Errors are thrown
 * as-is so hooks can map their short codes with gameErrorMessage().
 */

export interface StartAttemptArgs {
  mode: AttemptMode;
  quizSlug?: string;
  challengeCode?: string;
}

/** Opens a new attempt, or resumes an unfinished one of the same kind. */
export async function startAttempt(args: StartAttemptArgs): Promise<AttemptState> {
  const { data, error } = await supabase.rpc('start_attempt', {
    p_mode: args.mode,
    p_quiz_slug: args.quizSlug ?? null,
    p_challenge_code: args.challengeCode ?? null,
  });
  if (error) throw error;
  return data as unknown as AttemptState;
}

/** Shows the next question and starts its clock (idempotent). */
export async function nextQuestion(attemptId: string): Promise<AttemptState> {
  const { data, error } = await supabase.rpc('next_question', { p_attempt_id: attemptId });
  if (error) throw error;
  return data as unknown as AttemptState;
}

/** Grades one answer. Pass an option for choice/boolean, a value for slider. */
export async function answerQuestion(
  attemptId: string,
  answer: { optionId?: string | null; value?: number | null },
): Promise<AnswerResult> {
  const { data, error } = await supabase.rpc('answer_question', {
    p_attempt_id: attemptId,
    p_option_id: answer.optionId ?? null,
    p_value: answer.value ?? null,
  });
  if (error) throw error;
  return data as unknown as AnswerResult;
}

/** Totals the score and returns the full review. Safe to call again once finished. */
export async function finishAttempt(attemptId: string): Promise<AttemptSummary> {
  const { data, error } = await supabase.rpc('finish_attempt', { p_attempt_id: attemptId });
  if (error) throw error;
  return data as unknown as AttemptSummary;
}
