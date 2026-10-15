import { supabase } from '@/lib/supabase';
import type { AttemptMode, Board } from '@/types/database.types';
import type {
  AnswerResult,
  AttemptState,
  AttemptSummary,
  FriendChallengePreview,
  Leaderboard,
} from '@/types/game';

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

/**
 * Top rows plus "your rank". Public: nickname, avatar, score and time only.
 * For the daily board the slug may be omitted (today's challenge).
 */
export async function getLeaderboard(
  quizSlug: string | null,
  board: Board,
  limit = 50,
): Promise<Leaderboard> {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_quiz_slug: quizSlug,
    p_board: board,
    p_limit: limit,
  });
  if (error) throw error;
  return data as unknown as Leaderboard;
}

export interface DailyToday {
  id: string;
  date: string; // YYYY-MM-DD, Europe/London
  quiz: { slug: string; title: string; cover_image_url: string | null };
}

/** Today's date in Europe/London, the calendar the daily challenge runs on. */
export function londonToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Today's live daily challenge, or null when none is live yet. */
export async function getDailyToday(): Promise<DailyToday | null> {
  const today = londonToday();
  const { data: daily, error } = await supabase
    .from('daily_challenges')
    .select('id, challenge_date, quiz_id')
    .eq('status', 'live')
    .eq('challenge_date', today)
    .maybeSingle();
  if (error) throw error;
  if (!daily) return null;
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('slug, title, cover_image_url')
    .eq('id', daily.quiz_id)
    .maybeSingle();
  if (quizError) throw quizError;
  if (!quiz) return null;
  return { id: daily.id, date: daily.challenge_date, quiz };
}

/** True once the player has finished this daily challenge. */
export async function hasFinishedDaily(userId: string, dailyId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('daily_challenge_id', dailyId)
    .eq('status', 'finished');
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Makes (or reuses) an 8-character challenge link for a finished attempt. */
export async function createFriendChallenge(
  attemptId: string,
): Promise<{ code: string; expires_at: string }> {
  const { data, error } = await supabase.rpc('create_friend_challenge', {
    p_attempt_id: attemptId,
  });
  if (error) throw error;
  return data as unknown as { code: string; expires_at: string };
}

/** Public preview of a challenge: nickname and score only. Null when unknown. */
export async function getFriendChallenge(code: string): Promise<FriendChallengePreview | null> {
  const { data, error } = await supabase.rpc('get_friend_challenge', { p_code: code });
  if (error) throw error;
  return (data as unknown as FriendChallengePreview | null) ?? null;
}
