import { t } from '@/i18n';
import type { GameErrorCode } from '@/types/game';

/**
 * Friendly, child-safe copy for the short error codes raised by the PHP API. The words
 * live in the i18n catalogue (errors.game); the type below makes sure every code has one.
 */
const MESSAGES: Record<GameErrorCode, string> = t.errors.game;

const FALLBACK = t.errors.gameFallback;

/** Turn an API error into friendly copy. */
export function gameErrorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message?.trim() as GameErrorCode | undefined;
  return (
    (code && Object.prototype.hasOwnProperty.call(MESSAGES, code) && MESSAGES[code]) || FALLBACK
  );
}

/** True when the error is a known game rule (not a network or server failure). */
export function isGameError(error: { message?: string } | null | undefined): boolean {
  const code = error?.message?.trim();
  return code !== undefined && Object.prototype.hasOwnProperty.call(MESSAGES, code);
}
