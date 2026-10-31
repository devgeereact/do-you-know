import { describe, expect, it } from 'vitest';
import {
  addDays,
  blankQuestion,
  changeType,
  londonToday,
  markedAnswer,
  promptKey,
  toContent,
  validateQuestion,
} from '@/lib/adminValidation';
import type { QuestionContent } from '@/services/adminService';

const TODAY = '2026-10-31';
const good: QuestionContent = {
  type: 'choice',
  prompt: 'Which is the biggest cat?',
  options: [
    { label: 'Lion', correct: false },
    { label: 'Tiger', correct: true },
  ],
  explanation: 'Tigers are the largest wild cats.',
  source_url: 'https://www.britannica.com/animal/tiger',
  review_by: '2027-10-01',
};

const fields = (q: QuestionContent, today?: string): string[] =>
  validateQuestion(q, { today }).map((e) => e.field);

describe('validateQuestion', () => {
  it('accepts a complete question', () => {
    expect(validateQuestion(good)).toEqual([]);
  });

  it('flags choice problems', () => {
    const q = {
      ...good,
      options: [
        { label: 'Tiger', correct: true },
        { label: 'tiger ', correct: true },
      ],
    };
    expect(validateQuestion(q).map((e) => e.message)).toEqual([
      'Mark exactly one right answer',
      'Two answers are the same',
    ]);
    expect(fields({ ...good, options: [{ label: 'a', correct: true }] })).toContain('options');
  });

  it('marks missing explanation and source as "later"', () => {
    const errors = validateQuestion({ ...good, explanation: '', source_url: 'http://x.com' });
    expect(errors.every((e) => e.later)).toBe(true);
    expect(errors.map((e) => e.field)).toEqual(['explanation', 'source_url']);
  });

  it('flags a passed review date only when today is given', () => {
    const old = { ...good, review_by: '2026-01-01' };
    expect(fields(old)).toEqual([]);
    expect(fields(old, TODAY)).toEqual(['review_by']);
    expect(fields({ ...good, review_by: '2026-02-30' })).toEqual(['review_by']);
  });

  it('mirrors the server slider rules', () => {
    const base = blankQuestion('slider', TODAY);
    const slider = (s: Partial<NonNullable<QuestionContent['slider']>>): string[] =>
      validateQuestion({
        ...good,
        type: 'slider',
        options: undefined,
        slider: { ...base.slider!, ...s },
      }).map((e) => e.message);
    expect(slider({})).toEqual([]);
    expect(slider({ min: 100, max: 0 })).toContain('Minimum must be less than maximum');
    expect(slider({ step: 0.01, max: 100 })).toContain(
      'The range must divide into at most 1000 whole steps',
    );
    expect(slider({ correct: 50.5, accept_min: 50.5, accept_max: 50.5 })).toContain(
      'The right answer must land on a step',
    );
    expect(slider({ accept_min: 10, accept_max: 90 })).toContain(
      'The accepted range can be at most half the scale',
    );
    expect(slider({ correct: 120, accept_min: 120, accept_max: 120 })).toContain(
      'The right answer and its accepted range must sit inside min and max',
    );
    expect(slider({ min: Number.NaN })).toEqual(['Fill in every slider number']);
  });

  it('needs a boolean answer', () => {
    expect(fields({ ...good, type: 'boolean', options: undefined })).toEqual(['answer']);
  });
});

describe('helpers', () => {
  it('promptKey ignores punctuation, spaces and case', () => {
    expect(promptKey('What is 2 + 2?')).toBe(promptKey('what is 2+2'));
    expect(promptKey('7 + 8')).not.toBe(promptKey('7 × 8'));
  });

  it('dates', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(londonToday(new Date('2026-10-31T23:30:00Z'))).toBe('2026-10-31');
    expect(londonToday(new Date('2026-07-31T23:30:00Z'))).toBe('2026-08-01');
  });

  it('toContent keeps only the answer part for the type and nulls empty text', () => {
    const q = changeType({ ...good, id: 'x' }, 'boolean', TODAY);
    const c = toContent({ ...q, explanation: '  ', options: [{ label: 'a', correct: true }] });
    expect(c).toEqual({
      id: 'x',
      type: 'boolean',
      prompt: good.prompt,
      answer: true,
      explanation: null,
      source_url: good.source_url,
      review_by: good.review_by,
      scene: null,
    });
  });

  it('markedAnswer', () => {
    expect(markedAnswer(good)).toBe('Tiger');
    const s = blankQuestion('slider', TODAY);
    expect(
      markedAnswer({
        ...s,
        slider: { ...s.slider!, unit: 'days', accept_min: 48, accept_max: 52 },
      }),
    ).toBe('50 days (accepts 48 to 52)');
  });
});
