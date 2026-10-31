/**
 * Shapes returned by the PHP API (backend/src). Keep in step with that code.
 * Only public or owner-only fields reach the browser; answers never do.
 */

type Timestamps = { created_at: string; updated_at: string };

export type Role = 'guest' | 'player' | 'editor' | 'admin';
export type AgeBand = 'under_13' | '13_17' | '18_plus';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuizStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
export type AttemptMode = 'practice' | 'ranked' | 'daily' | 'challenge';
export type AttemptStatus = 'in_progress' | 'finished' | 'abandoned';
export type Board = 'all_time' | 'weekly' | 'daily';
export type ThemeMode = 'dark' | 'light';

/** GET /me */
export type Profile = Timestamps & {
  id: string;
  role: Role;
  nickname: string | null;
  age_band: AgeBand | null;
  avatar_id: string | null; // a preset id from src/lib/avatars.ts
  streak_current: number;
  streak_best: number;
  last_daily_date: string | null;
  /** The one nickname change has been used (owner rule, 31 October 2026). */
  nickname_locked: boolean;
  nickname_changed_at: string | null;
  /** Threads with a staff reply the player has not opened. */
  unread_messages: number;
};

/** GET /me/messages */
export interface MyMessage {
  id: string;
  type: 'feedback' | 'question' | 'idea' | 'problem';
  presets: string[];
  message: string | null;
  status: 'new' | 'open' | 'resolved';
  created_at: string;
  quiz: { slug: string; title: string } | null;
  question_prompt: string | null;
  unread: boolean;
  can_reply: boolean;
  thread: { id: string; from: 'staff' | 'me'; body: string; created_at: string }[];
}

/** GET /me/settings */
export type AppSettings = Timestamps & {
  id: string;
  user_id: string;
  theme: ThemeMode;
  notifications_enabled: boolean;
};
export type AppSettingsUpdate = Partial<Pick<AppSettings, 'theme' | 'notifications_enabled'>>;

/** GET /categories */
export type Category = Timestamps & {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: 'general' | 'school';
  icon: string | null;
  scene: string | null;
  sort_order: number;
  is_active: boolean;
};

/** GET /curriculum-tags */
export type CurriculumTag = {
  code: string;
  label: string;
  system: string;
  age_min: number | null;
  age_max: number | null;
  sort_order: number;
};

/** GET /quizzes */
export type Quiz = Timestamps & {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  category_id: string | null;
  difficulty: Difficulty;
  age_min: number | null;
  age_max: number | null;
  curriculum_tags: string[];
  cover_image_url: string | null;
  question_count: number;
  time_limit_seconds: number | null;
  shuffle_options: boolean;
  is_ranked: boolean;
  status: QuizStatus;
  publish_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
};
