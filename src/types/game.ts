/**
 * Shapes of the JSON returned by the game routes of the PHP API
 * (backend/src/Game.php and Competition.php). Keep in sync with that code.
 * None of these ever contain an answer before the player has answered.
 */
import type { AttemptMode, AttemptStatus } from '@/types/domain';

export type QuestionType = 'choice' | 'boolean' | 'slider';

export interface PublicOption {
  id: string;
  label: string;
}

export interface PublicSlider {
  min: number;
  max: number;
  step: number;
  unit: string | null;
}

/** A question as the player sees it — no answer fields. */
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  image_url: string | null;
  options: PublicOption[];
  slider: PublicSlider | null;
  /** Cosmetic world the question is shown in (one of src/lib/art.ts WORLD_KEYS), if set. */
  scene?: string | null;
}

/** start_attempt / next_question */
export interface AttemptState {
  attempt_id: string;
  mode: AttemptMode;
  status: AttemptStatus;
  quiz: { slug: string; title: string };
  position: number; // 1-based
  total: number;
  answered: number;
  correct: number;
  awaiting_next: boolean; // answered; call next_question to continue
  complete: boolean; // all answered; call finish_attempt
  time_limit_seconds: number | null;
  question: PublicQuestion | null;
  server_now: string;
  /** Server-issued display deadline for the current question. */
  question_deadline?: string | null;
}

/** answer_question */
export interface AnswerResult {
  is_correct: boolean;
  timed_out: boolean;
  correct_option_ids: string[];
  correct_value: number | null;
  accept_min: number | null;
  accept_max: number | null;
  explanation: string | null;
  source_url: string | null;
  position: number;
  total: number;
  is_last: boolean;
}

export interface ReviewItem {
  position: number;
  prompt: string;
  type: QuestionType;
  is_correct: boolean;
  timed_out: boolean;
  your_answer: string | number | null;
  correct_answer: string | number | null;
  explanation: string | null;
  source_url: string | null;
  time_ms: number;
}

/** finish_attempt */
export interface AttemptSummary {
  attempt_id: string;
  mode: AttemptMode;
  correct: number;
  total: number;
  answer_time_ms: number;
  review: ReviewItem[];
  ranks: { all_time?: number | null; weekly?: number | null; daily?: number | null };
  versus: {
    creator_nickname: string;
    creator_correct: number;
    creator_time_ms: number;
    you_won: boolean;
    tie: boolean;
  } | null;
  needs_nickname: boolean;
  streak: number;
}

export interface LeaderboardRow {
  rank: number;
  nickname: string;
  avatar_id: string | null;
  correct: number;
  total: number;
  answer_time_ms: number;
  achieved_at: string;
  is_me: boolean;
  /** Opaque handle used to like this entry. Not a player id. */
  entry_id: string;
  /** Total likes. Who liked is never sent. */
  likes: number;
  liked_by_me: boolean;
}

/** POST /likes */
export interface LikeResult {
  likes: number;
  liked_by_me: boolean;
}

/** GET /leaderboards */
export interface Leaderboard {
  top: LeaderboardRow[];
  me: { rank: number | null; correct: number; total: number; answer_time_ms: number } | null;
}

/** GET /challenges/{code} */
export interface FriendChallengePreview {
  code: string;
  expired: boolean;
  quiz: { slug: string; title: string; cover_image_url: string | null };
  creator: { nickname: string; avatar_id: string | null };
  creator_correct: number;
  total: number;
  creator_time_ms: number;
}

/** Error codes raised by the API, mapped to friendly copy in src/lib/gameErrors.ts. */
export type GameErrorCode =
  | 'not_signed_in'
  | 'invalid_mode'
  | 'too_many_attempts'
  | 'no_daily_today'
  | 'daily_already_played'
  | 'challenge_not_found'
  | 'own_challenge'
  | 'own_entry'
  | 'play_first'
  | 'invalid_like'
  | 'entry_not_found'
  | 'quiz_not_found'
  | 'attempt_not_found'
  | 'attempt_closed'
  | 'no_more_questions'
  | 'question_not_shown'
  | 'invalid_option'
  | 'invalid_value'
  | 'not_all_answered'
  | 'attempt_not_finished'
  | 'invalid_board'
  | 'invalid_age_band'
  | 'age_band_locked'
  | 'age_band_required'
  | 'kids_use_generated_nickname'
  | 'invalid_nickname'
  | 'nickname_not_allowed'
  | 'invalid_avatar'
  | 'network_error';

/** GET /me/continue: one of the player's own unfinished games the server would resume. */
export interface ContinueItem {
  attemptId: string;
  mode: AttemptMode;
  quiz: { slug: string; title: string };
  position: number; // question n of total
  total: number;
  startedAt: string;
  challengeCode: string | null; // set only for friend challenges, to resume /challenge/:code/play
}

/** GET /me/best: the player's best finished result for one published quiz. */
export interface BestScore {
  quiz: { slug: string; title: string };
  correct: number;
  total: number;
  answerTimeMs: number;
  finishedAt: string;
}

/** GET /leaderboards/overall: one board across every subject. */
export type OverallPeriod = 'day' | 'week' | 'month' | 'all';
export interface OverallRow {
  rank: number;
  nickname: string;
  avatar_id: string | null;
  points: number;
  accuracy: number;
  rounds: number;
  quizzes: number;
  is_me: boolean;
}
export interface OverallBoard {
  period: OverallPeriod;
  rows: OverallRow[];
  me: OverallRow | null;
  facts: {
    rounds: number;
    accuracy: number | null;
    top_category: { slug: string; name: string } | null;
    gap: number | null;
  };
}
