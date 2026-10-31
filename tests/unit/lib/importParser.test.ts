import { describe, expect, it } from 'vitest';
import {
  IMPORT_SAMPLE,
  groupsOf,
  guessSubject,
  parseImport,
  rowToContent,
  splitCsv,
  type ImportSubject,
} from '@/lib/importParser';

const TODAY = '2026-10-31';
const SUBJECTS: ImportSubject[] = [
  { slug: 'general-knowledge', name: 'General Knowledge', kind: 'general' },
  { slug: 'science-nature', name: 'Science & Nature', kind: 'general' },
  { slug: 'geography', name: 'Geography', kind: 'general' },
  { slug: 'maths', name: 'Maths', kind: 'school' },
  { slug: 'school-geography', name: 'Geography', kind: 'school' },
];

describe('parseImport (text)', () => {
  const rows = parseImport(IMPORT_SAMPLE, SUBJECTS, TODAY);

  it('finds every question in the sample with its line', () => {
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({ line: 1, guessed: true, subject: 'maths' });
    expect(rows[0]?.q.options?.map((o) => o.correct)).toEqual([false, true, false, false]);
    expect(rows[0]?.q.review_by).toBe('2027-10-31');
  });

  it('guesses subjects by keyword when there is no heading', () => {
    expect(rows[1]?.subject).toBe('science-nature');
    expect(rows[2]?.subject).toBe('geography');
  });

  it('blocks a choice question with no marked answer, and lists missing source as later', () => {
    expect(rows[2]?.block).toContain('Mark the right answer with * or “Answer: b”');
    expect(rows[2]?.later).toContain('Add a source link (https)');
  });

  it('applies "# Subject · KS · Topic" headings', () => {
    expect(rows[3]).toMatchObject({ subject: 'maths', ks: 'KS2', topic: 'Times tables 2' });
    expect(rows[3]?.guessed).toBe(false);
  });

  it('reads true/false and slider questions', () => {
    expect(rows[4]?.q).toMatchObject({ type: 'boolean', answer: true });
    expect(rows[6]?.q).toMatchObject({
      type: 'slider',
      slider: { min: 300, max: 400, step: 1, unit: 'days', correct: 366, accept_min: 366 },
    });
    expect(rows[6]?.block).toEqual([]);
  });

  it('marks an unknown heading as a new subject and reads "Answer: b" with one option per line', () => {
    expect(rows[7]).toMatchObject({ newSubject: 'Drama', ks: 'KS2', topic: 'Theatre words' });
    expect(rows[7]?.q.options?.find((o) => o.correct)?.label).toBe('Audience');
  });

  it('prefers the school subject when a heading with a key stage shares a name', () => {
    const [row] = parseImport(
      '# Geography · KS3\nQ: Longest river?\nA) Nile*  B) Thames',
      SUBJECTS,
      TODAY,
    );
    expect(row?.subject).toBe('school-geography');
  });

  it('flags duplicates in the file, multiple right answers and long prompts', () => {
    const text = [
      'Q: What is 2 + 2?',
      'A) 4*  B) 5*',
      'Q: What is 2+2',
      'A) 4*  B) 5',
      `Q: ${'x'.repeat(301)}`,
      'A) a*  B) b',
      'Q: One option only',
      'A) a*',
    ].join('\n');
    const r = parseImport(text, SUBJECTS, TODAY);
    expect(r[0]?.block).toContain('More than one answer is marked right');
    expect(r[1]?.block).toContain('Same as line 1 in this file');
    expect(r[2]?.block.join()).toMatch(/limit is 300/);
    expect(r[3]?.block).toContain('Choice questions need 2 to 6 answers');
  });

  it('checks slider rules: band over half the scale and off-step answers', () => {
    const r = parseImport(
      'Q: Pick a number\nSlider: 0-10 = 5 ±4\nQ: Another\nSlider: 0-10 = 2.5 ±0',
      SUBJECTS,
      TODAY,
    );
    expect(r[0]?.block).toContain('The accepted range can be at most half the scale');
    // Decimals in the numbers give a matching step, so 2.5 sits on a step.
    expect(r[1]?.q.slider?.step).toBe(0.1);
    expect(r[1]?.block).toEqual([]);
  });

  it('handles a BOM and Windows line endings', () => {
    const r = parseImport('\uFEFFQ: Is the Sun a star?\r\nTrue*/False\r\n', SUBJECTS, TODAY);
    expect(r).toHaveLength(1);
    expect(r[0]?.q).toMatchObject({ type: 'boolean', answer: true, prompt: 'Is the Sun a star?' });
  });
});

describe('parseImport (CSV)', () => {
  it('reads quoted fields with commas and quotes, subjects and answers', () => {
    const csv = [
      'subject,ks,topic,question,a,b,c,answer,explanation,source',
      'Maths,KS2,Sums,"What is 1,000 + 1?",1001,1002,,a,"Say ""one thousand and one"".",https://example.com/a',
      'Woodwork,,,"Is oak a tree?",,,,true,,',
    ].join('\n');
    const r = parseImport(csv, SUBJECTS, TODAY);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ line: 2, subject: 'maths', ks: 'KS2', topic: 'Sums', block: [] });
    expect(r[0]?.q.prompt).toBe('What is 1,000 + 1?');
    expect(r[0]?.q.explanation).toBe('Say "one thousand and one".');
    expect(r[1]).toMatchObject({ newSubject: 'Woodwork' });
    expect(r[1]?.q).toMatchObject({ type: 'boolean', answer: true });
  });

  it('splits a CSV line', () => {
    expect(splitCsv('a,"b,c","d ""e"""')).toEqual(['a', 'b,c', 'd "e"']);
  });
});

describe('groups and content', () => {
  it('groups ready rows by subject, key stage and topic', () => {
    const rows = parseImport(IMPORT_SAMPLE, SUBJECTS, TODAY);
    const groups = groupsOf(rows);
    const tables = groups.find((g) => g.topic === 'Times tables 2');
    expect(tables?.rows).toHaveLength(4);
    expect(groups.find((g) => g.sid === 'new:Drama')?.rows).toHaveLength(2);
    // The blocked Pacific question is not in any group.
    expect(groups.flatMap((g) => g.rows).some((r) => r.block.length)).toBe(false);
  });

  it('builds the server content shape with only the matching answer part', () => {
    const [row] = parseImport('Q: 9 × 9 = 81\nTrue*/False\nWhy: Nines.', SUBJECTS, TODAY);
    const content = row ? rowToContent(row) : null;
    expect(content).toEqual({
      type: 'boolean',
      prompt: '9 × 9 = 81',
      answer: true,
      explanation: 'Nines.',
      source_url: null,
      review_by: '2027-10-31',
      scene: null,
    });
  });

  it('falls back to general knowledge when no keyword matches', () => {
    expect(guessSubject('Who painted the Mona Lisa?', SUBJECTS)).toBe('general-knowledge');
  });
});
