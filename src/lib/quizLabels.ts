import type { Quiz } from '@/types';

const DIFFICULTY: Record<Quiz['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Tricky',
};

/** Kind, child-friendly difficulty word. */
export function difficultyLabel(difficulty: Quiz['difficulty']): string {
  return DIFFICULTY[difficulty];
}

/** Age range as a short label, e.g. "Ages 7–11", or null when it suits everyone. */
export function ageLabel(quiz: Pick<Quiz, 'age_min' | 'age_max'>): string | null {
  const { age_min: min, age_max: max } = quiz;
  if (min !== null && max !== null) return `Ages ${min}–${max}`;
  if (min !== null) return `Ages ${min}+`;
  if (max !== null) return `Up to age ${max}`;
  return null;
}
