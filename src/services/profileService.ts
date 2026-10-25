import { api, clearSession } from '@/lib/api';
import type { AgeBand, Profile } from '@/types';

/** The player's own profile. The server only ever returns the caller's row. */
export function getProfile(): Promise<Profile> {
  return api<Profile>('/me');
}

/** Sets the age band once; the server refuses a change afterwards. */
export async function setAgeBand(band: AgeBand): Promise<void> {
  await api<unknown>('/me/age-band', { body: { band } });
}

/** A friendly generated nickname such as "BraveOtter42". The only option for under-13s. */
export async function assignRandomNickname(): Promise<string> {
  return (await api<{ nickname: string }>('/me/nickname/random', { body: {} })).nickname;
}

/** A chosen nickname (13+ only), checked against the blocked-words list. */
export async function setNickname(nickname: string): Promise<string> {
  return (await api<{ nickname: string }>('/me/nickname', { body: { nickname } })).nickname;
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
