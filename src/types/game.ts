/**
 * Shapes of the JSON returned by the game RPCs in
 * supabase/migrations/0003_game_functions.sql. Keep in sync with that file.
 * None of these ever contain an answer before the player has answered.
 */
import type { AttemptMode, AttemptStatus } from '@/types/database.types';

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
  question_deadline: string | null;
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
  avatar_url: string | null;
  correct: number;
  total: number;
  answer_time_ms: number;
  achieved_at: string;
  is_me: boolean;
}

/** get_leaderboard */
export interface Leaderboard {
  top: LeaderboardRow[];
  me: { rank: number | null; correct: number; total: number; answer_time_ms: number } | null;
}

/** get_friend_challenge */
export interface FriendChallengePreview {
  code: string;
  expired: boolean;
  quiz: { slug: string; title: string; cover_image_url: string | null };
  creator: { nickname: string; avatar_url: string | null };
  creator_correct: number;
  total: number;
  creator_time_ms: number;
}

/** Avatar traits — allowed values live in site_config.avatar_traits (server-validated). */
export interface AvatarTraits {
  age_look: 'child' | 'teen' | 'adult';
  skin_tone: string;
  face_shape: string;
  hair_style: string;
  hair_colour: string;
  eye_colour: string;
  outfit: string;
  outfit_colour: string;
  accessory: string;
  facial_hair: string;
}

/** Error codes raised by the RPCs, mapped to friendly copy in src/lib/gameErrors.ts. */
export type GameErrorCode =
  | 'not_signed_in'
  | 'invalid_mode'
  | 'too_many_attempts'
  | 'no_daily_today'
  | 'daily_not_finished'
  | 'fresh_questions_exhausted'
  | 'daily_already_played'
  | 'challenge_not_found'
  | 'own_challenge'
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
  | 'no_pending_consent'
  | 'invalid_trait'
  | 'avatar_limit_reached'
  | 'avatar_combo_taken'
  | 'avatar_not_ready';
