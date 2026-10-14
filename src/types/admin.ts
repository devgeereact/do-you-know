/**
 * Staff-only shapes (CMS at /admin). These tables hold ANSWERS, so RLS only
 * lets editors/admins read them. Never import these into player-facing code.
 * Matches supabase/migrations/0002_quiz_core.sql.
 */
import type { Difficulty, Json } from '@/types/database.types';
import type { QuestionType } from '@/types/game';

export type QuestionStatus = 'draft' | 'in_review' | 'approved' | 'retired';

export interface Question {
  id: string;
  category_id: string | null;
  type: QuestionType;
  prompt: string;
  explanation: string | null;
  source_url: string | null;
  review_by: string | null;
  difficulty: Difficulty;
  age_min: number | null;
  age_max: number | null;
  image_url: string | null;
  slider_min: number | null;
  slider_max: number | null;
  slider_step: number | null;
  slider_unit: string | null;
  correct_value: number | null;
  accept_min: number | null;
  accept_max: number | null;
  status: QuestionStatus;
  origin: 'human' | 'ai';
  ai_draft_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  sort_order: number;
}

export interface AiQuestionDraft {
  id: string;
  topic: string;
  category_id: string | null;
  difficulty: Difficulty;
  age_min: number | null;
  age_max: number | null;
  count: number;
  model: string | null;
  status: 'queued' | 'running' | 'ready' | 'failed' | 'imported';
  result: Json | null;
  error: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
}

/** CSV import columns (one row per question). */
export interface QuestionCsvRow {
  type: QuestionType;
  prompt: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  correct: string; // option number (1–4), "true"/"false", or the slider value
  accept_min?: string;
  accept_max?: string;
  slider_min?: string;
  slider_max?: string;
  slider_step?: string;
  slider_unit?: string;
  explanation: string;
  source_url: string;
  difficulty?: Difficulty;
  age_min?: string;
  age_max?: string;
}
