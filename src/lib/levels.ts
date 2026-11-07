import type { ChildLevel } from '@/types';

/** The five levels a parent can pick. The years are a hint about the content, never the child's age. */
export const LEVELS: readonly { id: ChildLevel; name: string; years: string }[] = [
  { id: 'starters', name: 'Starters', years: 'ages 4–5' },
  { id: 'explorers', name: 'Explorers', years: 'ages 6–8' },
  { id: 'adventurers', name: 'Adventurers', years: 'ages 9–11' },
  { id: 'challengers', name: 'Challengers', years: 'ages 12–14' },
  { id: 'scholars', name: 'Scholars', years: 'ages 15–16' },
] as const;

export function levelLabel(level: ChildLevel): string {
  const found = LEVELS.find((l) => l.id === level);
  return found ? `${found.name} (${found.years})` : level;
}
