import type { GameErrorCode } from '@/types/game';

/**
 * Friendly, child-safe copy for the short error codes raised by the game RPCs.
 * Keep messages short, kind and actionable. All strings will move to the i18n
 * catalogue when a second language is added.
 */
const MESSAGES: Record<GameErrorCode, string> = {
  not_signed_in: 'Just a sec — getting you ready to play. Please try again.',
  invalid_mode: 'Something went wrong starting that game. Please try again.',
  too_many_attempts: 'Whoa, speedy! Take a breather and start again in a minute.',
  no_daily_today: "Today's challenge isn't ready yet. Try a quiz while you wait!",
  daily_already_played: "You've played today's challenge. Come back tomorrow for a new one!",
  challenge_not_found: 'This challenge link has expired or doesn’t exist.',
  own_challenge: "That's your own challenge — send it to a friend instead!",
  quiz_not_found: "We couldn't find that quiz.",
  attempt_not_found: "We couldn't find that game. Let's start a new one.",
  attempt_closed: 'That game has already finished.',
  no_more_questions: "That's all the questions — let's see your score!",
  question_not_shown: 'Hold on — loading the next question.',
  invalid_option: "That answer didn't go through. Please pick again.",
  invalid_value: 'Please pick a number on the slider.',
  not_all_answered: 'Answer every question to see your score.',
  attempt_not_finished: 'Finish the quiz first, then challenge a friend.',
  invalid_board: "We couldn't load that leaderboard.",
  invalid_age_band: 'Please choose an age group.',
  age_band_locked: 'Your age group is already set. Ask a grown-up to contact us to change it.',
  age_band_required: 'Please choose your age group first.',
  kids_use_generated_nickname: 'Pick one of our fun nicknames — tap shuffle to see more!',
  invalid_nickname: 'Nicknames need 3–20 letters or numbers.',
  nickname_not_allowed: "That nickname isn't allowed. Please try another.",
  no_pending_consent: 'There’s nothing waiting for a parent to confirm.',
  invalid_trait: 'One of those avatar choices isn’t available. Please change it.',
  avatar_limit_reached: "You've made 3 avatars today — come back tomorrow for more.",
  avatar_combo_taken: 'Someone already has that exact look! Change one thing to make it yours.',
  avatar_not_ready: 'Your avatar is still being painted. Hang tight!',
};

const FALLBACK = 'Oops — something went wrong. Please try again.';

/** Turn a Supabase RPC error into friendly copy. */
export function gameErrorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message?.trim() as GameErrorCode | undefined;
  return (code && MESSAGES[code]) || FALLBACK;
}

/** True when the error is a known game rule (not a network or server failure). */
export function isGameError(error: { message?: string } | null | undefined): boolean {
  const code = error?.message?.trim();
  return code !== undefined && code in MESSAGES;
}
