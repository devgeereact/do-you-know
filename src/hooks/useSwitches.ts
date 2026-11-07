import { useContext } from 'react';
import { SessionContext } from '@/context/SessionContext';
import type { ChildLevel, ParentSwitches } from '@/types';

/** Every switch off: what a guest, or anyone before their profile has loaded, gets. */
export const SWITCHES_OFF: ParentSwitches = {
  public_boards: false,
  challenge_friend: false,
  beat_clock: false,
  slider_questions: false,
  trivia_sets: false,
  sound: false,
  easy_read: false,
};

/**
 * The parent's switches for the player on this device, and the child's level when there is one.
 * Safe outside a SessionProvider (everything off), so small components can use it freely.
 */
export function useSwitches(): { switches: ParentSwitches; level: ChildLevel | null } {
  const ctx = useContext(SessionContext);
  return {
    switches: { ...SWITCHES_OFF, ...(ctx?.user?.switches ?? {}) },
    level: ctx?.user?.level ?? null,
  };
}
