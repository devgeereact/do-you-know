import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The play stage uses design tokens only (docs/SCREENS.md section 8) and never forces capitals:
// early readers read capitals slowly. World palettes in src/lib/worlds.ts are illustration data
// and are not part of this check.
const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

const css = read('src/index.css');
const start = css.indexOf('/* ---------- The game stage');
const end = css.indexOf('/* Scene motion from src/lib/art.ts');
const stageCss = css.slice(start, end);

const gameDir = 'src/components/game';
const stageFiles = [
  ...readdirSync(join(root, gameDir))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `${gameDir}/${f}`),
  'src/pages/PlayPage.tsx',
];

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

describe('the play stage', () => {
  it('finds its own CSS block', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
  });

  it('uses no hex colours in its CSS', () => {
    expect(stageCss.match(HEX) ?? []).toEqual([]);
  });

  it('forces no capitals in its CSS', () => {
    expect(stageCss).not.toMatch(/text-transform:\s*uppercase/);
    expect(stageCss).not.toMatch(/small-caps/);
  });

  it.each(stageFiles)('%s uses no hex colours and no forced capitals', (file) => {
    const source = read(file);
    expect(source.match(HEX) ?? []).toEqual([]);
    expect(source).not.toMatch(/\buppercase\b/);
    expect(source).not.toMatch(/small-caps/);
  });
});
