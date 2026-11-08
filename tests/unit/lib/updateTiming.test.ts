import { describe, expect, it } from 'vitest';
import { EARLY_MS, isCalmPath, shouldApplyUpdate } from '@/lib/updateTiming';

describe('when an update may apply itself', () => {
  it('only on calm pages', () => {
    for (const p of ['/', '/c/maths', '/q/some-quiz', '/daily', '/leaderboards', '/about']) {
      expect(isCalmPath(p)).toBe(true);
    }
    for (const p of [
      '/play/a-quiz',
      '/daily/play',
      '/learn/literacy',
      '/challenge/abc/play',
      '/admin/library',
      '/account',
      '/contact',
      '/grown-ups',
      '/me/settings',
    ]) {
      expect(isCalmPath(p)).toBe(false);
    }
  });

  it('straight away when found just after the app opened', () => {
    expect(shouldApplyUpdate({ pathname: '/', foundAfterMs: 1200, foundOnPath: '/' })).toBe(true);
  });

  it('later, only once the player has moved to another calm page', () => {
    const late = EARLY_MS + 1;
    expect(shouldApplyUpdate({ pathname: '/', foundAfterMs: late, foundOnPath: '/' })).toBe(false);
    expect(shouldApplyUpdate({ pathname: '/daily', foundAfterMs: late, foundOnPath: '/' })).toBe(
      true,
    );
  });

  it('never in a game or a form, however early', () => {
    expect(
      shouldApplyUpdate({ pathname: '/play/x', foundAfterMs: 100, foundOnPath: '/play/x' }),
    ).toBe(false);
    expect(
      shouldApplyUpdate({ pathname: '/admin/import', foundAfterMs: 100, foundOnPath: '/' }),
    ).toBe(false);
  });
});
