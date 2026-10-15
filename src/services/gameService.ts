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

export interface GameHistoryItem {
  attemptId: string;
  mode: AttemptMode;
  correct: number;
  total: number;
  answerTimeMs: number;
  finishedAt: string;
  quiz: { slug: string; title: string } | null; // null if the quiz is no longer published
}

/**
 * The player's own finished games, newest first. Scores are read back from the
 * rows the server wrote; RLS limits this to the signed-in user's attempts.
 */
export async function listMyGames(userId: string, limit = 20): Promise<GameHistoryItem[]> {
  const { data: attempts, error } = await supabase
    .from('attempts')
    .select('id, quiz_id, mode, correct_count, answered_count, answer_time_ms, finished_at')
    .eq('user_id', userId)
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (attempts.length === 0) return [];

  const quizIds = [...new Set(attempts.map((a) => a.quiz_id))];
  const { data: quizzes, error: quizError } = await supabase
    .from('quizzes')
    .select('id, slug, title')
    .in('id', quizIds);
  if (quizError) throw quizError;
  const byId = new Map(quizzes.map((q) => [q.id, { slug: q.slug, title: q.title }]));

  return attempts.map((a) => ({
    attemptId: a.id,
    mode: a.mode,
    correct: a.correct_count,
    total: a.answered_count, // a finished attempt has answered every question
    answerTimeMs: a.answer_time_ms,
    finishedAt: a.finished_at ?? '',
    quiz: byId.get(a.quiz_id) ?? null,
  }));
}
