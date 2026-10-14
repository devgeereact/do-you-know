import { supabase } from '@/lib/supabase';
import { ensureGuestSession } from '@/services/authService';
import type { AttemptMode } from '@/types/database.types';
import type { AttemptState, AnswerResult, AttemptSummary } from '@/types/game';

export interface StartArgs {
  mode: AttemptMode;
  quizSlug?: string;
  challengeCode?: string;
}
const starts = new Map<string, Promise<AttemptState>>();
export async function startAttempt(args: StartArgs): Promise<AttemptState> {
  const session = await ensureGuestSession();
  const key = JSON.stringify([session.user.id, args.mode, args.quizSlug, args.challengeCode]);
  const existing = starts.get(key);
  if (existing) return existing;
  const pending = (async (): Promise<AttemptState> => {
    const { data, error } = await supabase.rpc('start_attempt', {
      p_quiz_slug: args.quizSlug ?? null,
      p_mode: args.mode,
      p_challenge_code: args.challengeCode ?? null,
    });
    if (error) throw error;
    return data as unknown as AttemptState;
  })().finally(() => {
    starts.delete(key);
  });
  starts.set(key, pending);
  return pending;
}
export async function nextQuestion(attemptId: string): Promise<AttemptState> {
  const { data, error } = await supabase.rpc('next_question', { p_attempt_id: attemptId });
  if (error) throw error;
  return data as unknown as AttemptState;
}
export async function answerQuestion(
  attemptId: string,
  optionId: string | null,
  value: number | null,
): Promise<AnswerResult> {
  const { data, error } = await supabase.rpc('answer_question', {
    p_attempt_id: attemptId,
    p_option_id: optionId,
    p_value: value,
  });
  if (error) throw error;
  return data as unknown as AnswerResult;
}
export async function finishAttempt(attemptId: string): Promise<AttemptSummary> {
  const { data, error } = await supabase.rpc('finish_attempt', { p_attempt_id: attemptId });
  if (error) throw error;
  return data as unknown as AttemptSummary;
}
