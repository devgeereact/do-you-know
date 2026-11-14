import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A clean, calm type scale across the whole app, the Studio included (owner, 7 Nov 2026): nothing is bold,
// and nothing is forced into capitals. Hierarchy comes from size and colour.
const root = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const sources = walk(join(root, 'src')).filter((f) => /\.(tsx?|css)$/.test(f));

describe('type scale', () => {
  it('maps every Tailwind weight class to 500 or lighter', () => {
    const css = readFileSync(join(root, 'src/index.css'), 'utf8');
    const weights = Object.fromEntries(
      [...css.matchAll(/--font-weight-(\w+):\s*(\d+)/g)].map((m) => [m[1], m[2]]),
    ) as Record<string, string>;
    expect(Object.keys(weights).sort()).toEqual([
      'black',
      'bold',
      'extrabold',
      'medium',
      'semibold',
    ]);
    for (const value of Object.values(weights)) expect(Number(value)).toBeLessThanOrEqual(500);
  });

  it('has no raw font-weight above 600 in the CSS, and only strong text at 600', () => {
    const css = readFileSync(join(root, 'src/index.css'), 'utf8');
    const heavy = [...css.matchAll(/font-weight:\s*(\d+)/g)]
      .map((m) => Number(m[1]))
      .filter((w) => w > 600);
    expect(heavy).toEqual([]);
    expect(
      [...css.matchAll(/font-weight:\s*(\d+)/g)].filter((m) => Number(m[1]) > 500),
    ).toHaveLength(1);
  });

  it('forces no capitals and no wide letter-spacing anywhere in the app', () => {
    const offenders = sources
      .filter((f) =>
        /\buppercase\b|text-transform:\s*uppercase|tracking-(wide|wider|widest)\b/.test(
          readFileSync(f, 'utf8'),
        ),
      )
      .map((f) => f.replace(root, ''));
    expect(offenders).toEqual([]);
  });

  it('writes no headline in capitals in the copy', () => {
    const copy = readFileSync(join(root, 'src/i18n/en-GB.ts'), 'utf8');
    const shouting = [...copy.matchAll(/'([A-Z][A-Z !?,.']{9,})'/g)].map((m) => m[1]);
    expect(shouting).toEqual([]);
  });
});
