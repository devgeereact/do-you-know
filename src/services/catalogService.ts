import { api, ApiError } from '@/lib/api';
import type { Category, CurriculumTag, Quiz } from '@/types';

/** Public catalogue reads. The API returns only active categories and published quizzes. */

export interface QuizFilters {
  categoryId?: string;
  age?: number;
  curriculumTag?: string;
  search?: string;
}

/** Turns a 404 into null so pages can show a friendly "not found". */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function listCategories(): Promise<Category[]> {
  return api<Category[]>('/categories');
}

export function getCategory(slug: string): Promise<Category | null> {
  return orNull(api<Category>(`/categories/${encodeURIComponent(slug)}`));
}

export function listCurriculumTags(): Promise<CurriculumTag[]> {
  return api<CurriculumTag[]>('/curriculum-tags');
}

export function listQuizzes(filters: QuizFilters = {}): Promise<Quiz[]> {
  return api<Quiz[]>('/quizzes', {
    query: {
      category_id: filters.categoryId,
      age: filters.age,
      curriculum_tag: filters.curriculumTag,
      search: filters.search?.trim(),
    },
  });
}

/** Up to six published quizzes, most played in the last 7 days first, then newest. */
export function listTrendingQuizzes(): Promise<Quiz[]> {
  return api<Quiz[]>('/quizzes/trending');
}

export function getQuiz(slug: string): Promise<Quiz | null> {
  return orNull(api<Quiz>(`/quizzes/${encodeURIComponent(slug)}`));
}
