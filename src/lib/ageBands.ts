import type { Quiz } from '@/types';
import { t } from '@/i18n';

/**
 * Spec age bands (PRODUCT-SPEC §4). Each maps to one representative age: a quiz suits the
 * band when its age range contains that age, the same rule the API uses for `?age=`.
 */
export const AGE_BANDS = [
  { label: t.category.ageChips.ages6to8, age: 7 },
  { label: t.category.ageChips.ages9to11, age: 10 },
  { label: t.category.ageChips.ages12to14, age: 13 },
  { label: t.category.ageChips.ages15to16, age: 15 },
  { label: t.category.ageChips.adult, age: 18 },
] as const;

export function suitsAge(quiz: Pick<Quiz, 'age_min' | 'age_max'>, age: number): boolean {
  return (
    (quiz.age_min === null || quiz.age_min <= age) && (quiz.age_max === null || quiz.age_max >= age)
  );
}
