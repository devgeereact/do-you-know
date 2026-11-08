/**
 * When a waiting app update may be applied without asking. A reload loses what is on screen, so it
 * only happens on calm pages (never mid-game, in a form, signing in or in the Studio), and only at a
 * quiet moment: just after the app opened, or when the player has moved to another page.
 */
const CALM = /^\/(?:$|c\/|q\/|daily\/?$|leaderboards\/?$|how-to-play\/?$|about\/?$)/;

export const EARLY_MS = 8000;

export function isCalmPath(pathname: string): boolean {
  return CALM.test(pathname);
}

export function shouldApplyUpdate(input: {
  pathname: string;
  /** Milliseconds since the app opened when the update was found. */
  foundAfterMs: number;
  /** The page the player was on when the update was found. */
  foundOnPath: string;
}): boolean {
  if (!isCalmPath(input.pathname)) return false;
  return input.foundAfterMs <= EARLY_MS || input.pathname !== input.foundOnPath;
}
