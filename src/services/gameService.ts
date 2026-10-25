import { api } from '@/lib/api';
import type { AttemptMode, Board } from '@/types';
import type {
  AnswerResult,
  AttemptState,
  AttemptSummary,
  BestScore,
  ContinueItem,
  FriendChallengePreview,
  Leaderboard,
} from '@/types/game';

/**
 * Thin wrappers over the game routes of the PHP API. The server grades, times and
 * scores everything; these calls only pass the player's choice through and return
 * what the server says. Errors are thrown as ApiError so hooks can map their short
 * codes with gameErrorMessage().
 */

export interface StartAttemptArgs {
  mode: AttemptMode;
  quizSlug?: string;
  challengeCode?: string;
}

/** Opens a new attempt, or resumes an unfinished one of the same kind. */
export function startAttempt(args: StartAttemptArgs): Promise<AttemptState> {
  return api<AttemptState>('/attempts', {
    body: {
      mode: args.mode,
      ...(args.quizSlug ? { quiz_slug: args.quizSlug } : {}),
      ...(args.challengeCode ? { challenge_code: args.challengeCode } : {}),
    },
  });
}

const attempt = (id: string, action: string): string =>
  `/attempts/${encodeURIComponent(id)}/${action}`;

/** Shows the next question and starts its clock (idempotent). */
export function nextQuestion(attemptId: string): Promise<AttemptState> {
  return api<AttemptState>(attempt(attemptId, 'next'), { body: {} });
}

/** Grades one answer. Pass an option for choice/boolean, a value for slider. */
export function answerQuestion(
  attemptId: string,
  answer: { optionId?: string | null; value?: number | null },
): Promise<AnswerResult> {
  const body = answer.optionId ? { option_id: answer.optionId } : { value: answer.value };
  return api<AnswerResult>(attempt(attemptId, 'answer'), { body });
}

/** Totals the score and returns the full review. Safe to call again once finished. */
export function finishAttempt(attemptId: string): Promise<AttemptSummary> {
  return api<AttemptSummary>(attempt(attemptId, 'finish'), { body: {} });
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

/** The player's own finished games, newest first. */
export function listMyGames(limit = 20): Promise<GameHistoryItem[]> {
  return api<GameHistoryItem[]>('/me/games', { query: { limit } });
}

/** The player's own unfinished games that can still be resumed, newest first (max 5). */
export function listContinuePlaying(): Promise<ContinueItem[]> {
  return api<ContinueItem[]>('/me/continue');
}

/** The player's best finished result per quiz: most correct, then fastest (max 50). */
export function listMyBestScores(): Promise<BestScore[]> {
  return api<BestScore[]>('/me/best');
}

/** Top rows plus "your rank". Public: nickname, avatar, score and time only. */
export function getLeaderboard(
  quizSlug: string | null,
  board: Board,
  limit = 50,
): Promise<Leaderboard> {
  return api<Leaderboard>('/leaderboards', { query: { quiz_slug: quizSlug, board, limit } });
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
export function getDailyToday(): Promise<DailyToday | null> {
  return api<DailyToday | null>('/daily');
}

/** True once the player has finished this daily challenge. */
export async function hasFinishedDaily(dailyId: string): Promise<boolean> {
  const result = await api<{ finished: boolean }>(
    `/me/daily/${encodeURIComponent(dailyId)}/finished`,
  );
  return result.finished;
}

/** Makes (or reuses) an 8-character challenge link for a finished attempt. */
export function createFriendChallenge(
  attemptId: string,
): Promise<{ code: string; expires_at: string }> {
  return api<{ code: string; expires_at: string }>(attempt(attemptId, 'challenge'), { body: {} });
}

/** Public preview of a challenge: nickname and score only. Null when unknown. */
export function getFriendChallenge(code: string): Promise<FriendChallengePreview | null> {
  return api<FriendChallengePreview | null>(`/challenges/${encodeURIComponent(code)}`);
}
