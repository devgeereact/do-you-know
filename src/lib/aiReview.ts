// AI review of imported questions (ADR-021). The server answers ok, fix or flag for each
// question; these helpers plan the calls, show a fix as before and after, and apply a fix the
// person accepted. Nothing here saves anything.
import type { ChoiceOption, QuestionContent } from '@/services/adminService';

/** Questions per review call; the server takes up to 25. */
export const REVIEW_BATCH = 20;
/** Calls at once, so a big import neither crawls nor floods the model. */
export const REVIEW_CONCURRENCY = 2;

export type ReviewVerdict = 'ok' | 'fix' | 'flag';

export interface ReviewFix {
  prompt: string;
  options: ChoiceOption[];
  explanation: string;
}

export interface ReviewItem {
  index: number;
  verdict: ReviewVerdict;
  reason: string;
  fix?: ReviewFix;
}

export interface ReviewRequest {
  questions: QuestionContent[];
  subject?: string;
  topic?: string;
  age_min?: number | null;
  age_max?: number | null;
}

/** One review call: a slice of one quiz's questions. */
export interface ReviewBatch<T> {
  key: string;
  items: T[];
}

/** Splits each quiz into calls of at most `size` questions, never mixing two quizzes in a call. */
export function planBatches<T>(
  groups: { key: string; items: T[] }[],
  size = REVIEW_BATCH,
): ReviewBatch<T>[] {
  const out: ReviewBatch<T>[] = [];
  for (const g of groups) {
    for (let i = 0; i < g.items.length; i += size) {
      out.push({ key: g.key, items: g.items.slice(i, i + size) });
    }
  }
  return out;
}

export interface FixChange {
  field: 'Question' | 'Right answer' | 'Other answers' | 'Explanation';
  before: string;
  after: string;
}

const right = (options: ChoiceOption[] = []): string => options.find((o) => o.correct)?.label ?? '';
const others = (options: ChoiceOption[] = []): string =>
  options
    .filter((o) => !o.correct)
    .map((o) => o.label)
    .join(' · ');

/** What a fix changes, in reading order; unchanged parts are left out. */
export function diffFix(q: QuestionContent, fix: ReviewFix): FixChange[] {
  const changes: FixChange[] = [];
  const add = (field: FixChange['field'], before: string, after: string): void => {
    if (before !== after) changes.push({ field, before, after });
  };
  add('Question', q.prompt, fix.prompt);
  add('Right answer', right(q.options), right(fix.options));
  add('Other answers', others(q.options), others(fix.options));
  add('Explanation', q.explanation ?? '', fix.explanation);
  return changes;
}

/** The question with an accepted fix: new wording and answers, same source and review date. */
export function applyFix(q: QuestionContent, fix: ReviewFix): QuestionContent {
  return {
    ...q,
    prompt: fix.prompt,
    options: fix.options.map((o) => ({ ...o })),
    explanation: fix.explanation,
  };
}

export type BatchOutcome<R> = { ok: true; value: R } | { ok: false; error: string };

/** Runs every batch with limited concurrency; a failed batch is reported, not thrown. */
export async function runBatches<T, R>(
  batches: T[],
  run: (batch: T) => Promise<R>,
  concurrency = REVIEW_CONCURRENCY,
): Promise<BatchOutcome<R>[]> {
  const out: BatchOutcome<R>[] = new Array(batches.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < batches.length) {
      const i = next++;
      try {
        out[i] = { ok: true, value: await run(batches[i] as T) };
      } catch (err) {
        out[i] = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));
  return out;
}
