import { api, clearSession } from '@/lib/api';
import type { AgeBand, MyMessage, Profile } from '@/types';

/** The player's own profile. The server only ever returns the caller's row. */
export function getProfile(): Promise<Profile> {
  return api<Profile>('/me');
}

/** Sets the age band once; the server refuses a change afterwards. */
export async function setAgeBand(band: AgeBand): Promise<void> {
  await api<unknown>('/me/age-band', { body: { band } });
}

/** A generated nickname such as "BraveOtter42", saved straight away (first name or the one change). */
export async function assignRandomNickname(): Promise<string> {
  return (await api<{ nickname: string }>('/me/nickname/random', { body: {} })).nickname;
}

/** Four fresh generated nicknames nobody uses. Saves nothing. */
export async function getNicknameSuggestions(): Promise<string[]> {
  return (await api<{ suggestions: string[] }>('/me/nickname/suggestions')).suggestions;
}

/**
 * The player's one nickname change: a suggestion (anyone) or a typed name (13+ only), checked
 * against the blocked-words list and other players' names. 409 nickname_locked afterwards.
 */
export async function setNickname(nickname: string): Promise<string> {
  return (await api<{ nickname: string }>('/me/nickname', { body: { nickname } })).nickname;
}

/** The player's own messages: what they sent and the site's replies. */
export async function getMyMessages(): Promise<{ items: MyMessage[]; can_write: boolean }> {
  return api<{ items: MyMessage[]; can_write: boolean }>('/me/messages');
}

/** Clears the unread dot. */
export async function markMessagesSeen(): Promise<void> {
  await api<unknown>('/me/messages/seen', { body: {} });
}

/** A teenager or adult writes back in their own thread. */
export async function replyToMessage(id: string, body: string): Promise<void> {
  await api<unknown>(`/me/messages/${encodeURIComponent(id)}/reply`, { body: { body } });
}

/** Picks one of the preset avatars in src/lib/avatars.ts. */
export async function setAvatar(avatarId: string): Promise<void> {
  await api<unknown>('/me/avatar', { body: { avatar_id: avatarId } });
}

/** Removes the player; attempts, settings and board rows go with it. */
export async function deleteMyAccount(): Promise<void> {
  await api<unknown>('/me/delete', { body: { confirmed: true } });
  clearSession(); // the server already revoked this guest token
}
