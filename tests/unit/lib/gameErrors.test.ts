import { describe, expect, it } from 'vitest';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';

describe('gameErrorMessage', () => {
  it('turns a known server code into friendly copy', () => {
    expect(gameErrorMessage({ message: 'daily_already_played' })).toMatch(/come back tomorrow/i);
    expect(gameErrorMessage({ message: 'network_error' })).toMatch(/check your connection/i);
  });

  it('trims whitespace around the code', () => {
    expect(gameErrorMessage({ message: '  invalid_nickname \n' })).toMatch(/3.20 letters/);
  });

  it('falls back to one generic message for unknown, empty or missing errors', () => {
    const fallback = gameErrorMessage(null);
    expect(fallback).toMatch(/something went wrong/i);
    expect(gameErrorMessage(undefined)).toBe(fallback);
    expect(gameErrorMessage({})).toBe(fallback);
    expect(gameErrorMessage({ message: 'SQLSTATE[HY000] boom' })).toBe(fallback);
  });

  it('never leaks the raw code into the copy', () => {
    expect(gameErrorMessage({ message: 'attempt_closed' })).not.toContain('attempt_closed');
  });
});

describe('isGameError', () => {
  it('is true for known game rules only', () => {
    expect(isGameError({ message: 'quiz_not_found' })).toBe(true);
    expect(isGameError({ message: 'request_failed' })).toBe(false);
    expect(isGameError({ message: 'rate_limited' })).toBe(false);
    expect(isGameError(null)).toBe(false);
    expect(isGameError({})).toBe(false);
  });
});

describe('prototype keys from the server', () => {
  it.each(['constructor', 'toString', '__proto__'])('treats %s as unknown', (code) => {
    expect(typeof gameErrorMessage({ message: code })).toBe('string');
    expect(isGameError({ message: code })).toBe(false);
  });
});
