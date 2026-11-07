import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IMPORT_SAMPLE,
  groupTitle,
  groupsOf,
  importIntro,
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

  it('blocks a choice question with no marked answer, and does not ask for a source', () => {
    expect(rows[2]?.block).toContain('Mark the right answer with * or “Answer: b”');
    expect(rows[2]?.later.some((m) => /source/i.test(m))).toBe(false);
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
      `Q: ${'x'.repeat(601)}`,
      'A) a*  B) b',
      'Q: One option only',
      'A) a*',
    ].join('\n');
    const r = parseImport(text, SUBJECTS, TODAY);
    expect(r[0]?.block).toContain('More than one answer is marked right');
    expect(r[1]?.block).toContain('Same as line 1 in this file');
    expect(r[2]?.block.join()).toMatch(/limit is 600/);
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

describe('the owner’s science import (backend/tests/fixtures/import/science-body.md)', () => {
  const SCIENCE: ImportSubject[] = [
    ...SUBJECTS,
    { slug: 'school-science', name: 'Science', kind: 'school' },
  ];
  const text = readFileSync(
    path.resolve(__dirname, '../../../backend/tests/fixtures/import/science-body.md'),
    'utf8',
  );
  const rows = parseImport(text, SCIENCE, TODAY);
  const groups = groupsOf(rows);

  it('reads all 1,080 questions with four answers and one right answer, none blocked', () => {
    expect(rows).toHaveLength(1080);
    expect(rows.filter((r) => r.block.length)).toEqual([]);
    expect(rows.every((r) => r.q.options?.length === 4)).toBe(true);
    expect(rows.every((r) => r.q.options?.filter((o) => o.correct).length === 1)).toBe(true);
    expect(rows.some((r) => r.q.options?.some((o) => o.label.includes('*')))).toBe(false);
  });

  it('makes one quiz per heading, in the Science subject, with its age band', () => {
    expect(groups).toHaveLength(54);
    expect(groups.every((g) => g.sid === 'school-science' && g.rows.length === 20)).toBe(true);
    expect(groups[0]).toMatchObject({ topic: 'Food and digestion', ages: { min: 4, max: 5 } });
    expect(groupTitle(groups[0]!)).toBe('Food and digestion (ages 4–5)');
    const adult = groups.find((g) => g.ages?.min === 18)!;
    expect(adult.ages).toEqual({ min: 18, max: null });
    expect(groupTitle(adult)).toBe('Food and digestion (adults)');
    expect(new Set(groups.map((g) => groupTitle(g))).size).toBe(54);
  });

  it('turns a markdown source link into the plain https address', () => {
    const sourced = rows.filter((r) => r.q.source_url);
    expect(sourced).toHaveLength(258);
    expect(sourced.every((r) => /^https:\/\/[^\s[\]()]+$/.test(r.q.source_url ?? ''))).toBe(true);
    expect(rows[4]?.q.source_url).toBe(
      'https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works',
    );
  });

  const notesFor = (prompt: string): string[] =>
    rows.find((r) => r.q.prompt === prompt)?.notes ?? ['(question not found)'];

  it('writes a plain starting intro for each new quiz, which the owner can change', () => {
    expect(importIntro(groups[0]!)).toBe('20 questions about food and digestion, for ages 4–5.');
    const adult = groups.find((g) => g.ages?.min === 18)!;
    expect(importIntro(adult)).toBe('20 questions about food and digestion, for adults.');
    expect(importIntro({ ...groups[0]!, topic: '', ages: null }, 'Science')).toBe(
      '20 questions about science.',
    );
  });

  it('warns, without blocking, when the right answer just repeats the question', () => {
    expect(notesFor('Which structures make up the central nervous system?').join()).toMatch(
      /repeats the question/,
    );
  });

  it('warns when the right answer does not fit what the question asks for', () => {
    expect(notesFor('Which bone cells lay down new bone tissue?').join()).toMatch(/asks for cells/);
    expect(notesFor('Which description of bone is scientifically correct?').join()).toMatch(
      /yes or no/,
    );
    expect(notesFor('What is the coloured part of the eye called?')).toEqual([]);
  });

  it('warns about answers repeated within a quiz, and never blocks for a warning', () => {
    const all = rows.flatMap((r) => r.notes);
    expect(all.some((n) => /Same answers as line/.test(n))).toBe(true);
    expect(rows.filter((r) => r.notes.length).every((r) => r.block.length === 0)).toBe(true);
  });
});

describe('parseImport (tile questions)', () => {
  const parse = (text: string) => parseImport(text, SUBJECTS, TODAY);

  it('reads a spelling question with extra letters and dictation', () => {
    const [row] = parse(
      'Q: Spell the pet that purrs.\nSpell: cat | extra: xz | speak\nWhy: It purrs.',
    );
    expect(row?.q.type).toBe('build');
    expect(row?.q.build).toEqual({
      variant: 'spell',
      tiles: ['c', 'a', 't', 'x', 'z'],
      answers: [['c', 'a', 't']],
      speak: 'cat',
    });
    expect(row?.q.options).toBeUndefined();
    expect(row?.block).toEqual([]);
  });

  it('reads a gap question with decoys and another right answer', () => {
    const [row] = parse(
      'Q: Finish the sentence.\nGap: The cat ___ on the ___. = sat, mat | extra: dog | also: sits, mat\nWhy: Grammar.',
    );
    expect(row?.q.build).toEqual({
      variant: 'gap',
      template: 'The cat ___ on the ___.',
      tiles: ['sat', 'mat', 'sits', 'dog'],
      answers: [
        ['sat', 'mat'],
        ['sits', 'mat'],
      ],
    });
    expect(row?.block).toEqual([]);
  });

  it('reads an order question', () => {
    const [row] = parse('Q: Put the day in order.\nOrder: morning, noon, night\nWhy: Time passes.');
    expect(row?.q.build).toEqual({
      variant: 'order',
      tiles: ['morning', 'noon', 'night'],
      answers: [['morning', 'noon', 'night']],
    });
    expect(row?.block).toEqual([]);
  });

  it('reads a match question', () => {
    const [row] = parse(
      'Q: Match each animal to its home.\nMatch: Fish = Sea; Bird = Nest; Rabbit = Burrow\nWhy: Habitats.',
    );
    expect(row?.q.type).toBe('assign');
    expect(row?.q.assign).toEqual({
      variant: 'match',
      targets: ['Sea', 'Nest', 'Burrow'],
      items: [
        { label: 'Fish', to: 'Sea' },
        { label: 'Bird', to: 'Nest' },
        { label: 'Rabbit', to: 'Burrow' },
      ],
    });
    expect(row?.block).toEqual([]);
  });

  it('reads a sort question', () => {
    const [row] = parse('Q: Sort the numbers.\nSort: Odd = 3, 5; Even = 8, 12\nWhy: Odd and even.');
    expect(row?.q.assign).toEqual({
      variant: 'sort',
      targets: ['Odd', 'Even'],
      items: [
        { label: '3', to: 'Odd' },
        { label: '5', to: 'Odd' },
        { label: '8', to: 'Even' },
        { label: '12', to: 'Even' },
      ],
    });
    expect(row?.block).toEqual([]);
  });

  it('blocks a tile question the server would refuse, in plain words', () => {
    const [gap] = parse('Q: Finish it.\nGap: The cat sat on the mat. = sat, mat\nWhy: x');
    expect(gap?.block.join(' ')).toMatch(/___/);
    const [match] = parse('Q: Match.\nMatch: Fish = Sea; Bird = Sea\nWhy: x');
    expect(match?.block.length).toBeGreaterThan(0);
    const [spell] = parse('Q: Spell.\nSpell:\nWhy: x');
    expect(spell?.q.type).toBe('choice');
  });

  it('turns a tile row into content without the client id', () => {
    const [row] = parse('Q: Put the day in order.\nOrder: morning, noon, night\nWhy: Time passes.');
    const c = rowToContent(row!);
    expect(c.type).toBe('build');
    expect(c.build?.answers).toEqual([['morning', 'noon', 'night']]);
    expect(c).not.toHaveProperty('id');
  });
});
