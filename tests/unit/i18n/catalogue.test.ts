import { describe, expect, it } from 'vitest';
import { t, type Messages } from '@/i18n';
import { enGB } from '@/i18n/en-GB';

/** Every string leaf of the catalogue, with its dotted key. Functions are skipped. */
function stringLeaves(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === 'string') return [[path.join('.'), value]];
  if (typeof value === 'function') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => stringLeaves(item, [...path, String(index)]));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => stringLeaves(item, [...path, key]));
  }
  throw new Error(`Unexpected catalogue value at ${path.join('.')}`);
}

describe('en-GB catalogue', () => {
  it('is the active catalogue', () => {
    expect(t).toBe(enGB);
    expect(t.locale).toBe('en-GB');
  });

  it('has no empty or blank strings', () => {
    const leaves = stringLeaves(enGB);
    expect(leaves.length).toBeGreaterThan(300);
    const blank = leaves.filter(([, text]) => text.trim() === '').map(([key]) => key);
    expect(blank).toEqual([]);
  });

  it('keeps the house style: no em dashes outside the existing game error copy', () => {
    const withDash = stringLeaves(enGB)
      .filter(([, text]) => text.includes('—'))
      .map(([key]) => key)
      .filter((key) => !key.startsWith('errors.'));
    expect(withDash).toEqual([]);
  });

  it('fills in values through its small typed functions', () => {
    expect(t.play.questionOf(3, 10)).toBe('Question 3 of 10');
    expect(t.play.timer.badge(7)).toBe('7s');
    expect(t.play.timer.announce(10)).toBe('10 seconds left');
    expect(t.common.questionCount(12)).toBe('12 questions');
    expect(t.common.seconds(12_340)).toBe('12.3 s');
    expect(t.common.ages.range(7, 11)).toBe('Ages 7–11');
    expect(t.common.ages.from(13)).toBe('Ages 13+');
    expect(t.common.ages.upTo(9)).toBe('Up to age 9');
    expect(t.home.streak(1)).toBe('Streak: 1 day');
    expect(t.home.streak(4)).toBe('Streak: 4 days');
    expect(t.daily.dayUnit(1)).toBe('day');
    expect(t.daily.dayUnit(2)).toBe('days');
    expect(t.results.accuracy(80)).toBe('Accuracy 80%');
    expect(t.results.share.text(8, 10, 'Space')).toBe('I scored 8/10 on Space on Do You Know!');
    expect(t.challenge.create.text(8, 10, 'Space')).toBe(
      'I scored 8/10 on Space. Can you beat me?',
    );
    expect(t.challenge.scored('BraveOtter42', 7, 10)).toBe('BraveOtter42 scored 7/10.');
    expect(t.results.versus.youWon('Sam')).toBe('You beat Sam!');
    expect(t.leaderboards.table.withScore(6, 10)).toBe('with 6/10');
    expect(t.play.slider.range('10 km', '20 km')).toBe('(anything from 10 km to 20 km counts)');
    expect(t.meta.title('Settings')).toBe('Settings · Do You Know');
    expect(t.me.time(12_340)).toBe('12.3s');
    expect(t.info.terms.lead('1 May 2026')).toBe(
      'The fair-play rules for everyone. Last updated 1 May 2026.',
    );
  });
});

// Type tests: checked by `pnpm typecheck` (tests are in tsconfig). A second locale must
// match the en-GB shape exactly, but its words are free to differ.
const fakeLocale: Messages = {
  ...enGB,
  locale: 'fr-FR',
  common: { ...enGB.common, loading: 'Chargement…', questionCount: (n) => `${n} questions` },
  play: { ...enGB.play, questionOf: (position, total) => `Question ${position} sur ${total}` },
};

// @ts-expect-error a locale cannot leave out a key
const missingKey: Messages = { ...enGB, common: { ...enGB.common, loading: undefined } };

const wrongSignature: Messages = {
  ...enGB,
  // @ts-expect-error an interpolation must keep its parameter types
  play: { ...enGB.play, questionOf: (position: string) => position },
};

describe('Messages type', () => {
  it('accepts a different locale with the same shape', () => {
    expect(fakeLocale.common.loading).toBe('Chargement…');
    expect(fakeLocale.play.questionOf(2, 5)).toBe('Question 2 sur 5');
    expect(missingKey).toBeDefined();
    expect(wrongSignature).toBeDefined();
  });
});
