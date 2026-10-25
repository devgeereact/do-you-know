import { useCallback, useEffect, useState } from 'react';
import { reportError } from '@/lib/sentry';
import {
  getCategory,
  listCategories,
  listCurriculumTags,
  listQuizzes,
} from '@/services/catalogService';
import type { Category, CurriculumTag, Quiz } from '@/types';
import { t } from '@/i18n';

interface CatalogFilters {
  categorySlug?: string;
  age?: number; // matches age_min ≤ age ≤ age_max
  curriculumTag?: string; // e.g. 'uk-ks2'
  search?: string;
}

interface UseQuizCatalog {
  categories: Category[];
  quizzes: Quiz[];
  curriculumTags: CurriculumTag[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const LOAD_ERROR = t.errors.load.catalog;

/** Published categories, quizzes and curriculum tags with age/curriculum filters. */
export function useQuizCatalog(filters: CatalogFilters = {}): UseQuizCatalog {
  const { categorySlug, age, curriculumTag, search } = filters;
  const [categories, setCategories] = useState<Category[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [curriculumTags, setCurriculumTags] = useState<CurriculumTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isActive: () => boolean): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const [cats, tags, category] = await Promise.all([
          listCategories(),
          listCurriculumTags(),
          categorySlug ? getCategory(categorySlug) : Promise.resolve(null),
        ]);
        // An unknown category slug shows no quizzes rather than every quiz.
        const list =
          categorySlug && !category
            ? []
            : await listQuizzes({ categoryId: category?.id, age, curriculumTag, search });
        if (!isActive()) return;
        setCategories(cats);
        setCurriculumTags(tags);
        setQuizzes(list);
      } catch (err) {
        if (!isActive()) return;
        reportError(err, { area: 'quiz-catalog' });
        setError(LOAD_ERROR);
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [categorySlug, age, curriculumTag, search],
  );

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = useCallback((): Promise<void> => load(() => true), [load]);

  return { categories, quizzes, curriculumTags, loading, error, refresh };
}
