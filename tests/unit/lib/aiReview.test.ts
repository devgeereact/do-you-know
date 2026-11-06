import { describe, expect, it } from 'vitest';
import {
  REVIEW_BATCH,
  applyFix,
  diffFix,
  planBatches,
  runBatches,
  type ReviewFix,
} from '@/lib/aiReview';
import type { QuestionContent } from '@/services/adminService';

const q = (prompt: string, labels: string[], right: number): QuestionContent => ({
  type: 'choice',
  prompt,
  options: labels.map((label, i) => ({ label, correct: i === right })),
  explanation: 'Osteoblasts build the bone matrix.',
  source_url: 'https://training.seer.cancer.gov/anatomy/skeletal/growth.html',
  review_by: '2027-11-06',
});

const before = q(
  'Which bone cells lay down new bone tissue?',
  ['Bone resorption', 'Oxygen transport', 'Bone formation', 'Insulin release'],
  2,
);
const fix: ReviewFix = {
  prompt: 'What do osteoblasts mainly do?',
  options: before.options!,
  explanation: 'Osteoblasts build the bone matrix.',
};

describe('planBatches', () => {
  it('keeps each quiz in its own calls and splits big quizzes', () => {
    const groups = [
      { key: 'a', items: Array.from({ length: 45 }, (_, i) => i) },
      { key: 'b', items: [1, 2, 3] },
    ];
    const batches = planBatches(groups);
    expect(batches.map((b) => [b.key, b.items.length])).toEqual([
      ['a', REVIEW_BATCH],
      ['a', REVIEW_BATCH],
      ['a', 5],
      ['b', 3],
    ]);
  });

  it('makes no call for an empty quiz', () => {
    expect(planBatches([{ key: 'a', items: [] }])).toEqual([]);
  });
});

describe('diffFix', () => {
  it('names only what changed, with before and after', () => {
    expect(diffFix(before, fix)).toEqual([
      {
        field: 'Question',
        before: 'Which bone cells lay down new bone tissue?',
        after: 'What do osteoblasts mainly do?',
      },
    ]);
  });

  it('shows a changed right answer and changed wrong answers separately', () => {
    const swapped: ReviewFix = {
      ...fix,
      prompt: before.prompt,
      options: [
        { label: 'Bone resorption', correct: false },
        { label: 'Blood transport', correct: false },
        { label: 'Bone building', correct: true },
        { label: 'Insulin release', correct: false },
      ],
    };
    expect(diffFix(before, swapped).map((c) => c.field)).toEqual(['Right answer', 'Other answers']);
  });
});

describe('applyFix', () => {
  it('replaces the wording and answers but keeps the source and review date', () => {
    const after = applyFix(before, fix);
    expect(after.prompt).toBe('What do osteoblasts mainly do?');
    expect(after.source_url).toBe(before.source_url);
    expect(after.review_by).toBe(before.review_by);
    expect(after.options).toEqual(fix.options);
    expect(before.prompt).toBe('Which bone cells lay down new bone tissue?');
  });
});

describe('runBatches', () => {
  it('runs two at a time and keeps going after one fails', async () => {
    let running = 0;
    let most = 0;
    const out = await runBatches([1, 2, 3, 4, 5], async (n) => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      if (n === 3) throw new Error('busy');
      return n * 10;
    });
    expect(most).toBe(2);
    expect(out.map((o) => (o.ok ? o.value : o.error))).toEqual([10, 20, 'busy', 40, 50]);
  });
});
