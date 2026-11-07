import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupsOf, groupTitle, parseImport, type ImportSubject } from '@/lib/importParser';

/**
 * The P6 drafts (science and humanities) are import text for Studio → Import, not live content.
 * p3Drafts.test.ts covers importability, reasons, repeats and UK English for every p3 and p6 file;
 * this file covers what is specific to P6: the area each quiz will land in, the tile formats it
 * teaches with, and the owner's rule that religious knowledge is Christian only.
 */
const ROOT = path.resolve(__dirname, '../../../backend/content');
const DIR = path.join(ROOT, 'drafts');
const SUBJECTS: ImportSubject[] = (
  JSON.parse(readFileSync(path.join(ROOT, 'categories.json'), 'utf8')) as {
    categories: ImportSubject[];
  }
).categories.map(({ slug, name, kind }) => ({ slug, name, kind }));
const files = readdirSync(DIR).filter((f) => /^p6-.*\.txt$/.test(f));
const groups = files.flatMap((file) =>
  groupsOf(parseImport(readFileSync(path.join(DIR, file), 'utf8'), SUBJECTS, '2026-11-07')).map(
    (g) => ({ file, g }),
  ),
);

/** backend/src/Areas.php: category slug to learning area (the ones P6 uses). */
const AREA: Record<string, string> = {
  'school-science': 'science',
  'school-computing': 'science',
  geography: 'humanities',
  history: 'humanities',
  'bible-faith': 'humanities',
};
/** backend/src/Areas.php: the level of a quiz is set by its lowest age. */
const level = (min: number): string =>
  min <= 5
    ? 'starters'
    : min <= 8
      ? 'explorers'
      : min <= 11
        ? 'adventurers'
        : min <= 14
          ? 'challengers'
          : 'scholars';

describe('P6 science and humanities drafts', () => {
  it('has 10 science and 10 humanities quizzes', () => {
    const by = (prefix: string): number =>
      groups.filter(({ file }) => file.startsWith(prefix)).length;
    expect(by('p6-science')).toBe(10);
    expect(by('p6-humanities')).toBe(10);
  });

  it('every quiz lands in the area its file says, at the level its age band says', () => {
    const bad = groups
      .filter(({ file, g }) => {
        const slug = g.sid.replace(/^new:/, '');
        const want = file.startsWith('p6-science') ? 'science' : 'humanities';
        const fileLevel = /p6-[a-z]+-([a-z]+)\.txt/.exec(file)?.[1];
        return AREA[slug] !== want || !g.ages || level(g.ages.min) !== fileLevel;
      })
      .map(({ file, g }) => `${file}: ${groupTitle(g)} (${g.sid})`);
    expect(bad).toEqual([]);
  });

  it('every quiz uses at least one tile question, and every question has a reason', () => {
    const bad = groups
      .filter(({ g }) => !g.rows.some((r) => r.q.type === 'build' || r.q.type === 'assign'))
      .map(({ file, g }) => `${file}: ${groupTitle(g)} has no tile question`);
    expect(bad).toEqual([]);
    const noReason = groups.flatMap(({ file, g }) =>
      g.rows.filter((r) => !r.q.explanation?.trim()).map((r) => `${file}:${r.line}`),
    );
    expect(noReason).toEqual([]);
  });

  it('uses every tile format somewhere (match, sort, order, gap)', () => {
    const seen = new Set<string>();
    for (const { g } of groups) {
      for (const r of g.rows) {
        if (r.q.assign) seen.add(r.q.assign.variant);
        if (r.q.build) seen.add(r.q.build.variant);
      }
    }
    expect([...seen].sort()).toEqual(['gap', 'match', 'order', 'sort']);
  });

  it('religious knowledge is Christian only: no other faith is named', () => {
    const OTHER =
      /\b(islam|muslim|mosque|quran|koran|hindu|hinduism|diwali|sikh|gurdwara|buddhis|jewish|judaism|synagogue|torah|hanukkah|passover|eid|ramadan|temple of)\b/i;
    const bad = groups
      .filter(({ g }) => g.sid === 'bible-faith')
      .flatMap(({ file, g }) =>
        g.rows
          .filter((r) => OTHER.test(JSON.stringify(r.q)))
          .map((r) => `${file}:${r.line} ${r.q.prompt}`),
      );
    expect(bad).toEqual([]);
  });

  it('Bible questions say what a named book says, or state a plain fact (no unattributed doctrine)', () => {
    const rows = groups
      .filter(({ g }) => g.sid === 'bible-faith')
      .flatMap(({ file, g }) => g.rows.map((r) => ({ file, r })));
    // Words that turn a statement into a belief claim are only acceptable inside "Christians remember/celebrate/share".
    const CLAIM = /\b(God is|God has|Jesus is the|we must|you should|sin)\b/i;
    const bad = rows
      .filter(({ r }) => CLAIM.test(JSON.stringify(r.q)))
      .map(({ file, r }) => `${file}:${r.line} ${r.q.prompt}`);
    expect(bad).toEqual([]);
  });
});
