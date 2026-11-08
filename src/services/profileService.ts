import { api, clearSession, sessionEpoch } from '@/lib/api';
import type { AgeBand, MyMessage, Profile } from '@/types';
import type { LearnRecord } from '@/types/game';

let profileRequest: { epoch: number; promise: Promise<Profile> } | null = null;

/** Forgets the request in flight, so the next caller sees what a change made here has just saved. */
function profileChanged(): void {
  profileRequest = null;
}

/** Runs a change to the profile; requests started before or during it are never reused. */
async function change<T>(run: () => Promise<T>): Promise<T> {
  profileChanged();
  try {
    return await run();
  } finally {
    profileChanged();
  }
}

/**
 * The player's own profile. The server only ever returns the caller's row. Callers that ask
 * while a request is already on its way share it (the session, the daily and My games all ask on
 * the same page load), but only while the browser is still playing as the same player: a new
 * guest, a hand-over or a sign-out starts a new request. Nothing is kept once it has finished,
 * and a change made through this service starts a new request, so a caller that asks after a
 * save never gets an older answer. A caller already waiting on an older request still receives
 * what it asked for.
 */
export function getProfile(): Promise<Profile> {
  const epoch = sessionEpoch();
  if (profileRequest?.epoch === epoch) return profileRequest.promise;
  const promise = api<Profile>('/me').finally(() => {
    if (profileRequest?.promise === promise) profileRequest = null;
  });
  profileRequest = { epoch, promise };
  return promise;
}

/** Sets the age band once; the server refuses a change afterwards. */
export async function setAgeBand(band: AgeBand): Promise<void> {
  await change(() => api<unknown>('/me/age-band', { body: { band } }));
}

/** A generated nickname such as "BraveOtter42", saved straight away (first name or the one change). */
export async function assignRandomNickname(): Promise<string> {
  return (await change(() => api<{ nickname: string }>('/me/nickname/random', { body: {} })))
    .nickname;
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
  return (await change(() => api<{ nickname: string }>('/me/nickname', { body: { nickname } })))
    .nickname;
}

/** The player's own messages: what they sent and the site's replies. */
export async function getMyMessages(): Promise<{ items: MyMessage[]; can_write: boolean }> {
  return api<{ items: MyMessage[]; can_write: boolean }>('/me/messages');
}

/** Clears the unread dot. */
export async function markMessagesSeen(): Promise<void> {
  await change(() => api<unknown>('/me/messages/seen', { body: {} }));
}

/** A teenager or adult writes back in their own thread. */
export async function replyToMessage(id: string, body: string): Promise<void> {
  await api<unknown>(`/me/messages/${encodeURIComponent(id)}/reply`, { body: { body } });
}

/** Picks one of the preset avatars in src/lib/avatars.ts. */
export async function setAvatar(avatarId: string): Promise<void> {
  await change(() => api<unknown>('/me/avatar', { body: { avatar_id: avatarId } }));
}

/** A child's own steps, sessions and stickers. A guest has none (the server answers 403). */
export function getMyLearn(): Promise<LearnRecord> {
  return api<LearnRecord>('/me/learn');
}

/** Removes the player; attempts, settings and board rows go with it. */
export async function deleteMyAccount(): Promise<void> {
  await change(() => api<unknown>('/me/delete', { body: { confirmed: true } }));
  clearSession(); // the server already revoked this guest token
}
