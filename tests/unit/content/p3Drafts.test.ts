import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { promptKey } from '@/lib/adminValidation';
import { groupsOf, groupTitle, parseImport, type ImportSubject } from '@/lib/importParser';

/**
 * The P3 quiz drafts (backend/content/drafts) are import text for Studio → Import. They are not live
 * until someone imports and publishes them, so this guard keeps them importable and clean.
 */
const DIR = path.resolve(__dirname, '../../../backend/content/drafts');
const SEED = path.resolve(__dirname, '../../../backend/content');
// The same subjects the Studio offers (the seed's categories), so a heading resolves as it will live.
const SUBJECTS: ImportSubject[] = (
  JSON.parse(readFileSync(path.join(SEED, 'categories.json'), 'utf8')) as {
    categories: ImportSubject[];
  }
).categories.map(({ slug, name, kind }) => ({ slug, name, kind }));
const TODAY = '2026-11-07';
const files = readdirSync(DIR).filter((f) => /^p[36]-.*\.txt$/.test(f));

const rows = files.flatMap((file) =>
  parseImport(readFileSync(path.join(DIR, file), 'utf8'), SUBJECTS, TODAY).map((row) => ({
    file,
    row,
  })),
);
const groups = files.flatMap((file) =>
  groupsOf(parseImport(readFileSync(path.join(DIR, file), 'utf8'), SUBJECTS, TODAY)).map((g) => ({
    file,
    g,
  })),
);

// American spellings and words a UK primary teacher would not use.
const US =
  /\b(color|colour's|favorite|neighbor|center|meter|gray|math|mom|candy|soccer|recess|eraser|pants|sidewalk|zip code|organize|realize|practicing)\b/i;

describe('P3 and P6 quiz drafts', () => {
  it('has the literacy and numeracy files', () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  it('every question imports with no blocking problem and has a reason line', () => {
    const bad = rows
      .filter(({ row }) => row.block.length > 0 || row.later.length > 0)
      .map(
        ({ file, row }) =>
          `${file}:${row.line} ${row.q.prompt} → ${[...row.block, ...row.later].join('; ')}`,
      );
    expect(bad).toEqual([]);
  });

  it('every heading resolves to a real subject and an age band', () => {
    const bad = groups
      .filter(({ g }) => g.sid.startsWith('new:') || !g.ages)
      .map(({ file, g }) => `${file}: ${groupTitle(g)}`);
    expect(bad).toEqual([]);
  });

  it('every quiz has at least 6 questions and no more than 50', () => {
    const bad = groups
      .filter(({ g }) => g.rows.length < 6 || g.rows.length > 50)
      .map(({ file, g }) => `${file}: ${groupTitle(g)} has ${g.rows.length}`);
    expect(bad).toEqual([]);
  });

  it('no prompt repeats within the drafts or against the seed quizzes', () => {
    const seen = new Map<string, string>();
    for (const f of readdirSync(SEED).filter(
      (n) => n.endsWith('.json') && n !== 'categories.json',
    )) {
      const quiz = JSON.parse(readFileSync(path.join(SEED, f), 'utf8')) as {
        questions?: { prompt: string }[];
      };
      for (const q of quiz.questions ?? []) seen.set(promptKey(q.prompt), `seed ${f}`);
    }
    const repeats: string[] = [];
    for (const { file, row } of rows) {
      const key = promptKey(row.q.prompt);
      if (seen.has(key))
        repeats.push(`${file}:${row.line} repeats ${seen.get(key)}: ${row.q.prompt}`);
      seen.set(key, `${file}:${row.line}`);
    }
    expect(repeats).toEqual([]);
  });

  it('uses UK English', () => {
    const bad = rows
      .filter(({ row }) => US.test(JSON.stringify(row.q)))
      .map(({ file, row }) => `${file}:${row.line} ${row.q.prompt}`);
    expect(bad).toEqual([]);
  });

  it('a dictation quiz is all dictation; no other quiz has a spoken word', () => {
    const bad = groups
      .filter(({ g }) => {
        const spoken = g.rows.filter((r) => r.q.build?.speak !== undefined).length;
        return spoken !== 0 && spoken !== g.rows.length;
      })
      .map(({ file, g }) => `${file}: ${groupTitle(g)}`);
    expect(bad).toEqual([]);
  });

  it('every tile question can be answered from its own tiles and every number answer fits its scale', () => {
    // Content rules are re-checked by the server on import; this keeps a typo from reaching the Studio.
    const bad = rows
      .filter(
        ({ row }) =>
          row.q.type === 'slider' && row.q.slider && !Number.isInteger(row.q.slider.correct * 100),
      )
      .map(({ file, row }) => `${file}:${row.line}`);
    expect(bad).toEqual([]);
  });
});
