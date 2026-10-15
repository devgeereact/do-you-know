/**
 * Supabase schema types.
 *
 * Regenerate after any migration (this replaces the hand-written file):
 *   supabase gen types typescript --project-id <ref> --schema public \
 *     > src/types/database.types.ts
 *
 * Hand-written to match supabase/migrations/0001–0004. Covers every table the
 * BROWSER may read (RLS-guarded) plus every callable RPC. Staff-only tables
 * (questions, question_options, quiz_versions, ai_question_drafts, …) are typed
 * in src/types/admin.ts and only used inside /admin.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type Role = 'guest' | 'player' | 'editor' | 'admin';
export type AgeBand = 'under_13' | '13_17' | '18_plus';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuizStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
export type AttemptMode = 'practice' | 'ranked' | 'daily' | 'challenge';
export type AttemptStatus = 'in_progress' | 'finished' | 'abandoned';
export type AvatarStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'rejected';
export type Board = 'all_time' | 'weekly' | 'daily';

type ProfileRow = Timestamps & {
  id: string;
  email: string | null;
  full_name: string | null; // legacy from 0001; not collected (children's privacy)
  avatar_url: string | null; // legacy from 0001; avatars live in `avatars`
  role: Role;
  nickname: string | null;
  age_band: AgeBand | null;
  avatar_id: string | null;
  streak_current: number;
  streak_best: number;
  last_daily_date: string | null;
};

type AppSettingsRow = Timestamps & {
  id: string;
  user_id: string;
  theme: 'dark' | 'light';
  notifications_enabled: boolean;
};

type CategoryRow = Timestamps & {
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

type CurriculumTagRow = {
  code: string;
  label: string;
  system: string;
  age_min: number | null;
  age_max: number | null;
  sort_order: number;
};

type QuizRow = Timestamps & {
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
  current_version_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_by: string | null;
  updated_by: string | null;
};

type DailyChallengeRow = Timestamps & {
  id: string;
  challenge_date: string;
  quiz_id: string;
  quiz_version_id: string | null;
  status: 'scheduled' | 'live' | 'done';
  created_by: string | null;
};

type AttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  quiz_version_id: string;
  mode: AttemptMode;
  daily_challenge_id: string | null;
  friend_challenge_id: string | null;
  question_order: string[];
  current_index: number;
  current_sent_at: string | null;
  correct_count: number;
  answered_count: number;
  answer_time_ms: number;
  status: AttemptStatus;
  started_at: string;
  finished_at: string | null;
};

type AvatarRow = Timestamps & {
  id: string;
  user_id: string;
  traits: Json;
  trait_key: string;
  status: AvatarStatus;
  image_url: string | null;
  model: string | null;
  error: string | null;
};

/**
 * Read-only to players: RLS grants them no insert/update on these tables, and
 * the game writes through RPCs. Insert/Update stay typed for staff tooling.
 */
type ReadOnly<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        // Protected columns (role, nickname, age_band, avatar_id, streaks) are reset by a
        // trigger unless changed through an RPC — only these are effectively writable.
        Update: Partial<Pick<ProfileRow, 'full_name' | 'avatar_url'>>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: Partial<AppSettingsRow> & { user_id: string };
        Update: Partial<Pick<AppSettingsRow, 'theme' | 'notifications_enabled'>>;
        Relationships: [
          {
            foreignKeyName: 'app_settings_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: ReadOnly<CategoryRow>;
      curriculum_tags: ReadOnly<CurriculumTagRow>;
      quizzes: ReadOnly<QuizRow>;
      daily_challenges: ReadOnly<DailyChallengeRow>;
      attempts: ReadOnly<AttemptRow>;
      avatars: ReadOnly<AvatarRow>;
    };
    Views: Record<never, never>;
    Functions: {
      start_attempt: {
        Args: { p_quiz_slug?: string | null; p_mode?: AttemptMode; p_challenge_code?: string | null };
        Returns: Json;
      };
      next_question: { Args: { p_attempt_id: string }; Returns: Json };
      answer_question: {
        Args: { p_attempt_id: string; p_option_id?: string | null; p_value?: number | null };
        Returns: Json;
      };
      finish_attempt: { Args: { p_attempt_id: string }; Returns: Json };
      get_leaderboard: {
        Args: { p_quiz_slug?: string | null; p_board?: Board; p_limit?: number };
        Returns: Json;
      };
      create_friend_challenge: { Args: { p_attempt_id: string }; Returns: Json };
      get_friend_challenge: { Args: { p_code: string }; Returns: Json };
      set_age_band: { Args: { p_band: AgeBand }; Returns: undefined };
      assign_random_nickname: { Args: Record<string, never>; Returns: string };
      set_nickname: { Args: { p_nickname: string }; Returns: string };
      confirm_parental_consent: { Args: Record<string, never>; Returns: undefined };
      request_avatar: { Args: { p_traits: Json }; Returns: Json };
      get_avatar_options: { Args: Record<string, never>; Returns: Json }; // 0006
      set_active_avatar: { Args: { p_avatar_id: string }; Returns: undefined };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      publish_quiz: { Args: { p_quiz_id: string; p_publish_at?: string | null }; Returns: string };
      import_ai_draft: { Args: { p_draft_id: string }; Returns: Json };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<never, never>;
  };
};
