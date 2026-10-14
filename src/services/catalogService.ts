import { supabase } from '@/lib/supabase';
import type { Category, CurriculumTag, Quiz } from '@/types';

/** Public discovery metadata only. Author IDs and unpublished content are excluded. */
export type CatalogQuiz = Pick<
  Quiz,
  | 'id'
  | 'slug'
  | 'title'
  | 'intro'
  | 'category_id'
  | 'difficulty'
  | 'age_min'
  | 'age_max'
  | 'curriculum_tags'
  | 'cover_image_url'
  | 'question_count'
  | 'time_limit_seconds'
  | 'is_ranked'
>;

export interface CatalogFilters {
  categorySlug?: string;
  age?: number;
  curriculumTag?: string;
  search?: string;
}
export interface QuizCatalog {
  categories: Category[];
  quizzes: CatalogQuiz[];
  curriculumTags: CurriculumTag[];
}

export async function getQuizCatalog(
  filters: CatalogFilters = {},
  signal?: AbortSignal,
): Promise<QuizCatalog> {
  const controller = signal ?? new AbortController().signal;
  const [categoriesResult, quizzesResult, tagsResult] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .abortSignal(controller),
    supabase
      .from('quizzes')
      .select(
        'id,slug,title,intro,category_id,difficulty,age_min,age_max,curriculum_tags,cover_image_url,question_count,time_limit_seconds,is_ranked',
      )
      .eq('status', 'published')
      .order('title')
      .abortSignal(controller),
    supabase.from('curriculum_tags').select('*').order('sort_order').abortSignal(controller),
  ]);
  for (const result of [categoriesResult, quizzesResult, tagsResult]) {
    if (result.error) throw result.error;
  }
  const categories = categoriesResult.data ?? [];
  const categoryId = filters.categorySlug
    ? categories.find((category) => category.slug === filters.categorySlug)?.id
    : undefined;
  const quizzes = (quizzesResult.data ?? []).filter((quiz) => {
    if (filters.categorySlug && quiz.category_id !== categoryId) return false;
    if (
      filters.age !== undefined &&
      ((quiz.age_min !== null && filters.age < quiz.age_min) ||
        (quiz.age_max !== null && filters.age > quiz.age_max))
    )
      return false;
    if (filters.curriculumTag && !quiz.curriculum_tags.includes(filters.curriculumTag))
      return false;
    if (
      filters.search &&
      !quiz.title.toLocaleLowerCase('en-GB').includes(filters.search.toLocaleLowerCase('en-GB'))
    )
      return false;
    return true;
  });
  return { categories, quizzes, curriculumTags: tagsResult.data ?? [] };
}
