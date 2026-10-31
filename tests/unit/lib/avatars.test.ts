import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AVATARS, findAvatar } from '@/lib/avatars';

/** The server whitelist, parsed from the PHP source so the two lists cannot drift. */
function serverAvatars(): string[] {
  const source = readFileSync(path.resolve(__dirname, '../../../backend/src/Player.php'), 'utf8');
  const match = /public const AVATARS = \[([^\]]+)\];/.exec(source);
  if (!match?.[1]) throw new Error('Player::AVATARS not found in backend/src/Player.php');
  return [...match[1].matchAll(/'([a-z0-9_-]+)'/g)].map((m) => m[1] as string);
}

describe('preset avatars', () => {
  it('offers exactly 12 presets', () => {
    expect(AVATARS).toHaveLength(12);
  });

  it('matches the backend Player::AVATARS whitelist, in the same order', () => {
    expect(AVATARS.map((avatar) => avatar.id)).toEqual(serverAvatars());
  });

  it('has unique ids, labels and characters, each with a colour token class', () => {
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(12);
    expect(new Set(AVATARS.map((a) => a.label)).size).toBe(12);
    expect(new Set(AVATARS.map((a) => a.character)).size).toBe(12);
    for (const avatar of AVATARS) {
      expect(avatar.colour).toBe(`bg-avatar-${avatar.id}`);
      expect(avatar.label.length).toBeGreaterThan(0);
    }
  });

  it('finds an avatar by id and returns null for unknown or empty ids', () => {
    expect(findAvatar('fox')?.label).toBe('Mug');
    expect(findAvatar('fox')?.character).toBe('mug');
    expect(findAvatar('not-an-avatar')).toBeNull();
    expect(findAvatar(null)).toBeNull();
    expect(findAvatar(undefined)).toBeNull();
    expect(findAvatar('')).toBeNull();
  });
});
