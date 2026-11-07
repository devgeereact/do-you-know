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

  it('allows a question with no source, but not a source that is not https', () => {
    expect(validateQuestion({ ...good, source_url: '' })).toEqual([]);
    expect(validateQuestion({ ...good, source_url: null })).toEqual([]);
    expect(fields({ ...good, source_url: 'http://x.com' })).toEqual(['source_url']);
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

// ---- Tile questions: build (spell, gap, order) and assign (match, sort) ----
const meta = {
  explanation: 'Because.',
  source_url: null,
  review_by: '2027-10-01',
};
const spell: QuestionContent = {
  type: 'build',
  prompt: 'Spell the pet that purrs.',
  build: { variant: 'spell', tiles: ['c', 'a', 't', 'x'], answers: [['c', 'a', 't']] },
  ...meta,
};
const gap: QuestionContent = {
  type: 'build',
  prompt: 'Finish the sentence.',
  build: {
    variant: 'gap',
    template: 'The cat ___ on the ___.',
    tiles: ['sat', 'mat', 'dog'],
    answers: [['sat', 'mat']],
  },
  ...meta,
};
const order: QuestionContent = {
  type: 'build',
  prompt: 'Put the day in order.',
  build: {
    variant: 'order',
    tiles: ['morning', 'noon', 'night'],
    answers: [['morning', 'noon', 'night']],
  },
  ...meta,
};
const match: QuestionContent = {
  type: 'assign',
  prompt: 'Match each animal to its home.',
  assign: {
    variant: 'match',
    targets: ['Sea', 'Nest'],
    items: [
      { label: 'Fish', to: 'Sea' },
      { label: 'Bird', to: 'Nest' },
    ],
  },
  ...meta,
};
const sort: QuestionContent = {
  type: 'assign',
  prompt: 'Sort the numbers.',
  assign: {
    variant: 'sort',
    targets: ['Odd', 'Even'],
    items: [
      { label: '3', to: 'Odd' },
      { label: '8', to: 'Even' },
      { label: '5', to: 'Odd' },
    ],
  },
  ...meta,
};
const edit = (
  q: QuestionContent,
  change: Partial<NonNullable<QuestionContent['build']>>,
): QuestionContent => ({
  ...q,
  build: { ...q.build!, ...change },
});
const editA = (
  q: QuestionContent,
  change: Partial<NonNullable<QuestionContent['assign']>>,
): QuestionContent => ({
  ...q,
  assign: { ...q.assign!, ...change },
});

describe('validateQuestion for tile questions (mirrors Content.php)', () => {
  it('accepts a good spell, gap, order, match and sort question', () => {
    for (const q of [spell, gap, order, match, sort]) expect(validateQuestion(q)).toEqual([]);
  });

  it('flags a build question with no data, an answer that needs a missing tile, or uneven answers', () => {
    expect(fields({ ...spell, build: undefined })).toContain('build');
    expect(fields(edit(spell, { answers: [['c', 'a', 'z']] }))).toContain('build');
    expect(fields(edit(gap, { answers: [['sat', 'mat'], ['sat']] }))).toContain('build');
    expect(fields(edit(spell, { answers: [] }))).toContain('build');
    expect(
      fields(
        edit(spell, {
          answers: [
            ['c', 'a', 't'],
            ['c', 'a', 't'],
          ],
        }),
      ),
    ).toContain('build');
  });

  it('flags the same rules as the server for each build variant', () => {
    expect(fields(edit(spell, { tiles: ['ca', 't'], answers: [['ca', 't']] }))).toContain('build');
    expect(fields(edit(order, { tiles: [...order.build!.tiles, 'extra'] }))).toContain('build');
    expect(fields(edit(gap, { template: 'The cat ___ on the mat.' }))).toContain('build');
    expect(fields(edit(gap, { template: undefined }))).toContain('build');
    expect(fields(edit(spell, { template: 'Spell ___.' }))).toContain('build');
    expect(fields(edit(gap, { speak: 'sat mat' }))).toContain('build');
    expect(fields(edit(spell, { speak: 'dog' }))).toContain('build');
    expect(fields(edit(spell, { speak: 'cat' }))).toEqual([]);
  });

  it('flags tile counts and label lengths', () => {
    expect(fields(edit(order, { tiles: ['only'], answers: [['only']] }))).toContain('build');
    const long = 'w'.repeat(25);
    expect(fields(edit(gap, { tiles: ['sat', long, 'dog'], answers: [['sat', long]] }))).toContain(
      'build',
    );
    const many = Array.from({ length: 13 }, () => 'a');
    expect(fields(edit(spell, { tiles: many, answers: [many] }))).toContain('build');
  });

  it('flags assign problems: unknown target, repeated partner, empty group, counts, repeated names', () => {
    expect(
      fields(editA(match, { items: [{ label: 'Fish', to: 'Sky' }, match.assign!.items[1]!] })),
    ).toContain('assign');
    expect(
      fields(
        editA(match, {
          items: [
            { label: 'Fish', to: 'Sea' },
            { label: 'Bird', to: 'Sea' },
          ],
        }),
      ),
    ).toContain('assign');
    expect(fields(editA(sort, { targets: ['Odd', 'Even', 'Neither'] }))).toContain('assign');
    expect(fields(editA(sort, { items: sort.assign!.items.slice(0, 2) }))).toContain('assign');
    expect(
      fields(
        editA(match, {
          targets: ['Sea', 'sea'],
          items: [
            { label: 'Fish', to: 'Sea' },
            { label: 'Bird', to: 'sea' },
          ],
        }),
      ),
    ).toContain('assign');
    expect(
      fields(
        editA(sort, {
          items: [
            { label: '3', to: 'Odd' },
            { label: '3', to: 'Even' },
            { label: '5', to: 'Odd' },
          ],
        }),
      ),
    ).toContain('assign');
    expect(fields({ ...match, assign: undefined })).toContain('assign');
  });

  it('starts a new tile question with a re-check date and a valid blank shape to fill in', () => {
    const b = blankQuestion('build', TODAY);
    expect(b.type).toBe('build');
    expect(b.build?.variant).toBe('spell');
    const a = blankQuestion('assign', TODAY);
    expect(a.type).toBe('assign');
    expect(a.assign?.variant).toBe('match');
    expect(a.assign?.items).toHaveLength(2);
  });

  it('toContent keeps the build and assign parts and trims labels', () => {
    expect(toContent({ ...spell, id: 'q1' }).build).toEqual(spell.build);
    expect(toContent(match).assign).toEqual(match.assign);
    const trimmed = toContent(
      editA(match, {
        items: [
          { label: ' Fish ', to: ' Sea ' },
          { label: 'Bird', to: 'Nest' },
        ],
        targets: [' Sea ', 'Nest'],
      }),
    );
    expect(trimmed.assign?.items[0]).toEqual({ label: 'Fish', to: 'Sea' });
    expect(trimmed.assign?.targets[0]).toBe('Sea');
    expect(toContent(spell).options).toBeUndefined();
    expect(toContent(spell).slider).toBeUndefined();
  });

  it('describes the marked answer in words', () => {
    expect(markedAnswer(spell)).toBe('cat');
    expect(markedAnswer(gap)).toBe('sat mat');
    expect(markedAnswer(match)).toBe('Fish → Sea; Bird → Nest');
    expect(markedAnswer({ ...spell, build: undefined })).toBe('None marked');
  });

  it('changing a type to build or assign starts fresh but keeps the shared text', () => {
    const q = changeType({ ...good, id: 'x' }, 'assign', TODAY);
    expect(q.assign?.variant).toBe('match');
    expect(q.prompt).toBe(good.prompt);
    expect(q.options).toBeUndefined();
  });
});
