import rules from '../../backend/content/house-rules.json';

/**
 * The house rules as warnings: the same checks as backend/src/HouseRules.php, from the same word list
 * (backend/content/house-rules.json) and tested against the same cases. They never block anything.
 */
export interface HouseWarning {
  index: number | null;
  field: string;
  level: 'warning';
  code: 'us_spelling' | 'other_faith' | 'sacrament' | 'no_min_age' | 'age_spans_levels';
  message: string;
}

export interface QuizLike {
  category?: string | null;
  age_min?: number | null;
  age_max?: number | null;
  questions: object[];
}

const US = rules.us_spelling as Record<string, string>;
const wordRe = (words: string[]): RegExp =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_])(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}_])`,
    'giu',
  );
const US_RE = wordRe(Object.keys(US));
const FAITH_RE = wordRe(rules.other_faith);
const SACRAMENT_RE = wordRe(rules.sacrament);

/** The same ladder as backend Areas::level. */
function levelOf(ageMin: number): string {
  if (ageMin >= 18) return 'adult';
  if (ageMin <= 5) return 'starters';
  if (ageMin <= 8) return 'explorers';
  if (ageMin <= 11) return 'adventurers';
  if (ageMin <= 14) return 'challengers';
  return 'scholars';
}
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function strings(node: unknown, into: string[]): void {
  if (typeof node === 'string') into.push(node);
  else if (Array.isArray(node)) node.forEach((n) => strings(n, into));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => strings(n, into));
}

/** The text of a question by place: prompt, explanation, answers, tiles. */
function parts(q: Record<string, unknown>): Record<string, string> {
  const options = Array.isArray(q.options)
    ? (q.options as { label?: unknown }[]).flatMap((o) =>
        typeof o?.label === 'string' ? [o.label] : [],
      )
    : [];
  const tiles: string[] = [];
  for (const key of ['build', 'assign', 'slider']) {
    if (q[key] && typeof q[key] === 'object') strings(q[key], tiles);
  }
  return {
    prompt: typeof q.prompt === 'string' ? q.prompt : '',
    explanation: typeof q.explanation === 'string' ? q.explanation : '',
    options: options.join(' '),
    tiles: tiles.join(' '),
  };
}

function scan(
  p: Record<string, string>,
  re: RegExp,
  show: (w: string) => string,
): { field: string; hits: string[] } | null {
  let field: string | null = null;
  const hits = new Set<string>();
  for (const [name, text] of Object.entries(p)) {
    if (!text) continue;
    for (const m of text.matchAll(re)) {
      field ??= name;
      hits.add(show(m[1] ?? ''));
    }
  }
  return field === null ? null : { field, hits: [...hits] };
}

/** Warnings for one question. `religious` is true in the religious subject, where the faith rules apply. */
export function questionWarnings(q: object, religious: boolean, index: number): HouseWarning[] {
  const out: HouseWarning[] = [];
  const p = parts(q as Record<string, unknown>);
  const us = scan(p, US_RE, (w) => `“${w}” (${US[w.toLowerCase()] ?? ''})`);
  if (us) {
    out.push({
      index,
      field: us.field,
      level: 'warning',
      code: 'us_spelling',
      message: `US spelling: ${us.hits.join(', ')}. Use UK spelling.`,
    });
  }
  if (religious) {
    const faith = scan(p, FAITH_RE, (w) => `“${w.toLowerCase()}”`);
    if (faith) {
      out.push({
        index,
        field: faith.field,
        level: 'warning',
        code: 'other_faith',
        message: `Names another faith (${faith.hits.join(', ')}). Religious questions are Christian only.`,
      });
    }
    const sacrament = scan(p, SACRAMENT_RE, (w) => `“${w.toLowerCase()}”`);
    if (sacrament) {
      out.push({
        index,
        field: sacrament.field,
        level: 'warning',
        code: 'sacrament',
        message: `Mentions ${sacrament.hits.join(', ')}. Leave out sacraments, saints and denominational practice, or check it only states what the Bible says.`,
      });
    }
  }
  return out;
}

/** Quiz-level warnings first (ages), then each question in order. */
export function houseWarnings(quiz: QuizLike): HouseWarning[] {
  const out: HouseWarning[] = [];
  const min = typeof quiz.age_min === 'number' ? quiz.age_min : null;
  const max = typeof quiz.age_max === 'number' ? quiz.age_max : null;
  if (min === null) {
    out.push({
      index: null,
      field: 'ages',
      level: 'warning',
      code: 'no_min_age',
      message:
        'No minimum age is set. Set one, and 18 for an adult set, so children are not shown it by mistake.',
    });
  } else if (max !== null && levelOf(min) !== levelOf(max)) {
    const a = cap(levelOf(min));
    const b = cap(levelOf(max));
    out.push({
      index: null,
      field: 'ages',
      level: 'warning',
      code: 'age_spans_levels',
      message: `Ages ${min} to ${max} span more than one level (${a} and ${b}). It shows at ${a}.`,
    });
  }
  const religious = rules.religious_categories.includes(quiz.category ?? '');
  quiz.questions.forEach((q, i) => out.push(...questionWarnings(q, religious, i)));
  return out;
}
