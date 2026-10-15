import { supabase } from '@/lib/supabase';
import type { Category, CurriculumTag, Quiz } from '@/types';

/**
 * Public catalogue reads. RLS only returns active categories and published
 * quizzes to players, and none of these tables hold answers.
 */

export interface QuizFilters {
  categoryId?: string;
  age?: number;
  curriculumTag?: string;
  search?: string;
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return data;
}

export async function getCategory(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCurriculumTags(): Promise<CurriculumTag[]> {
  const { data, error } = await supabase.from('curriculum_tags').select('*').order('sort_order');
  if (error) throw error;
  return data;
}

export async function listQuizzes(filters: QuizFilters = {}): Promise<Quiz[]> {
  let query = supabase.from('quizzes').select('*').eq('status', 'published');
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.curriculumTag) query = query.contains('curriculum_tags', [filters.curriculumTag]);
  if (filters.age !== undefined) {
    // A quiz with no age bounds suits everyone.
    query = query
      .or(`age_min.is.null,age_min.lte.${filters.age}`)
      .or(`age_max.is.null,age_max.gte.${filters.age}`);
  }
  if (filters.search) query = query.ilike('title', `%${filters.search.replace(/[%_,()]/g, ' ')}%`);
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getQuiz(slug: string): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data;
}
