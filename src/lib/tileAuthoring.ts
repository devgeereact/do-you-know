import type { AssignSpec, BuildSpec } from '@/services/adminService';

/**
 * Plain-text helpers for writing tile questions in DYK Studio (keyboard use is for adults only). The
 * editor and the import format both turn what a person types into the exact `build` shape the server
 * stores, and back. Pure: no network, no DOM.
 */

/** "sat, mat ,, dog" → ["sat", "mat", "dog"]. */
export function splitList(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The letters of a word, one tile each; spaces are not tiles. */
export function lettersOf(text: string): string[] {
  return Array.from(text).filter((ch) => ch.trim() !== '');
}

const norm = (label: string): string => label.trim().toLowerCase();

/** A spelling question: the word is the answer; extra letters are decoys. `speak` reads the word aloud (practice only). */
export function spellSpec(word: string, extra: string, speak: boolean): BuildSpec {
  const answer = lettersOf(word);
  return {
    variant: 'spell',
    tiles: [...answer, ...lettersOf(extra)],
    answers: [answer],
    ...(speak && answer.length ? { speak: answer.join('') } : {}),
  };
}

/**
 * A fill-the-gap question. `answer` fills the gaps in order; `alternates` are other lists that are also
 * right. The tiles are every word the answers need, plus the decoys.
 */
export function gapSpec(
  template: string,
  answer: string[],
  extra: string[],
  alternates: string[][] = [],
): BuildSpec {
  const answers = [answer, ...alternates].filter((a) => a.length > 0);
  const need = new Map<string, { label: string; count: number }>();
  for (const a of answers) {
    const here = new Map<string, number>();
    for (const label of a) {
      const key = norm(label);
      here.set(key, (here.get(key) ?? 0) + 1);
      const seen = need.get(key);
      if (!seen) need.set(key, { label, count: 1 });
      else if ((here.get(key) ?? 0) > seen.count) seen.count = here.get(key) ?? 0;
    }
  }
  const tiles: string[] = [];
  for (const { label, count } of need.values())
    for (let i = 0; i < count; i += 1) tiles.push(label);
  return { variant: 'gap', template, tiles: [...tiles, ...extra], answers };
}

/** Put-in-order cards: every card is used once, so the cards are the tiles. */
export function orderSpec(cards: string[]): BuildSpec {
  return { variant: 'order', tiles: [...cards], answers: [[...cards]] };
}

/** Tiles left over once the answers' needs are taken out: the decoys. */
function decoys(spec: BuildSpec): string[] {
  const need = new Map<string, number>();
  for (const a of spec.answers) {
    const here = new Map<string, number>();
    for (const label of a) here.set(norm(label), (here.get(norm(label)) ?? 0) + 1);
    for (const [key, n] of here) need.set(key, Math.max(need.get(key) ?? 0, n));
  }
  const left: string[] = [];
  for (const tile of spec.tiles) {
    const key = norm(tile);
    const n = need.get(key) ?? 0;
    if (n > 0) need.set(key, n - 1);
    else left.push(tile);
  }
  return left;
}

export interface SpellFields {
  word: string;
  extra: string;
  speak: boolean;
}

export function spellFields(spec: BuildSpec): SpellFields {
  return {
    word: (spec.answers[0] ?? []).join(''),
    extra: decoys(spec).join(''),
    speak: spec.speak !== undefined,
  };
}

export interface GapFields {
  template: string;
  answer: string;
  extra: string;
  /** Other accepted answers, one comma list each. */
  also: string[];
}

export function gapFields(spec: BuildSpec): GapFields {
  return {
    template: spec.template ?? '',
    answer: (spec.answers[0] ?? []).join(', '),
    extra: decoys(spec).join(', '),
    also: spec.answers.slice(1).map((a) => a.join(', ')),
  };
}

/** How many ___ a sentence has. */
export function gapCount(template: string): number {
  return template.split('___').length - 1;
}

/** The variants a new tile question can start as. Switching starts the answer part again. */
export function freshBuild(variant: BuildSpec['variant']): BuildSpec {
  if (variant === 'gap') return { variant, template: '', tiles: [], answers: [[]] };
  return { variant, tiles: [], answers: [[]] };
}

export function freshAssign(variant: AssignSpec['variant']): AssignSpec {
  if (variant === 'sort') {
    return {
      variant,
      targets: ['', ''],
      items: [
        { label: '', to: '' },
        { label: '', to: '' },
        { label: '', to: '' },
      ],
    };
  }
  return {
    variant,
    targets: ['', ''],
    items: [
      { label: '', to: '' },
      { label: '', to: '' },
    ],
  };
}
