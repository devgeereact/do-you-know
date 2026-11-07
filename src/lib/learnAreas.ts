import type { CharacterKey } from '@/lib/art';
import type { LearnArea } from '@/types/game';

/** The four areas a child can learn in, with the words and the character each one wears. */
export const LEARN_AREAS: readonly {
  id: LearnArea;
  name: string;
  lead: string;
  character: CharacterKey;
}[] = [
  { id: 'literacy', name: 'Words', lead: 'Spelling, reading and sentences', character: 'owl' },
  { id: 'numeracy', name: 'Numbers', lead: 'Counting, sums and patterns', character: 'battery' },
  { id: 'science', name: 'Science', lead: 'How the world works', character: 'planet' },
  { id: 'humanities', name: 'Our world', lead: 'People, places and the past', character: 'globe' },
] as const;

export const isLearnArea = (value: string | undefined): value is LearnArea =>
  LEARN_AREAS.some((a) => a.id === value);

export const areaName = (id: LearnArea): string => LEARN_AREAS.find((a) => a.id === id)?.name ?? id;
