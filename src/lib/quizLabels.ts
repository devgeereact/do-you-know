import type { Quiz } from '@/types';
import { t } from '@/i18n';

const DIFFICULTY: Record<Quiz['difficulty'], string> = t.common.difficulty;

/** Kind, child-friendly difficulty word. */
export function difficultyLabel(difficulty: Quiz['difficulty']): string {
  return DIFFICULTY[difficulty];
}

/** Age range as a short label, e.g. "Ages 7–11", or null when it suits everyone. */
export function ageLabel(quiz: Pick<Quiz, 'age_min' | 'age_max'>): string | null {
  const { age_min: min, age_max: max } = quiz;
  if (min !== null && max !== null) return t.common.ages.range(min, max);
  if (min !== null) return t.common.ages.from(min);
  if (max !== null) return t.common.ages.upTo(max);
  return null;
}
