import type { Database } from '@/types/database.types';

/** Convenience row aliases used across the app. */
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type AppSettings = Database['public']['Tables']['app_settings']['Row'];
export type AppSettingsUpdate =
  Database['public']['Tables']['app_settings']['Update'];

export type ThemeMode = 'dark' | 'light';

type Tables = Database['public']['Tables'];
export type Category = Tables['categories']['Row'];
export type CurriculumTag = Tables['curriculum_tags']['Row'];
export type Quiz = Tables['quizzes']['Row'];
export type DailyChallenge = Tables['daily_challenges']['Row'];
export type Attempt = Tables['attempts']['Row'];
export type Avatar = Tables['avatars']['Row'];

export type {
  Role,
  AgeBand,
  Difficulty,
  QuizStatus,
  AttemptMode,
  AttemptStatus,
  AvatarStatus,
  Board,
} from '@/types/database.types';
export type * from '@/types/game';
