import { api } from '@/lib/api';
import type { Child, ChildLevel, ParentSwitches } from '@/types';
import type { LearnRecord } from '@/types/game';

/** Every parent call carries the Clerk session token; the server refuses guests and children. */
export type GetToken = () => Promise<string | null>;

async function call<T>(getToken: GetToken, path: string, body?: unknown): Promise<T> {
  const authToken = await getToken();
  if (!authToken) throw new Error('not_signed_in');
  return api<T>(path, { ...(body === undefined ? {} : { body }), authToken });
}

export async function listChildren(getToken: GetToken): Promise<Child[]> {
  return (await call<{ children: Child[] }>(getToken, '/parent/children')).children;
}

/** Nothing typed: a level, and optionally one of the preset avatars. The server makes the nickname. */
export async function addChild(
  getToken: GetToken,
  input: { level: ChildLevel; avatar_id?: string },
): Promise<Child> {
  return (await call<{ child: Child }>(getToken, '/parent/children', input)).child;
}

export async function changeChild(
  getToken: GetToken,
  id: string,
  change: { level?: ChildLevel; avatar_id?: string; new_nickname?: true },
): Promise<Child> {
  return (
    await call<{ child: Child }>(getToken, `/parent/children/${encodeURIComponent(id)}`, change)
  ).child;
}

export async function removeChild(getToken: GetToken, id: string): Promise<void> {
  await call<unknown>(getToken, `/parent/children/${encodeURIComponent(id)}/delete`, {
    confirmed: true,
  });
}

/** A guest token for the child. The caller adopts it, then signs the parent out. */
export function handOver(
  getToken: GetToken,
  id: string,
): Promise<{ token: string; expires_at: string; child: Child }> {
  return call(getToken, `/parent/children/${encodeURIComponent(id)}/hand-over`, {});
}

/** One child's skill map and stickers (ids, counts and dates only). */
export function getChildSkills(
  getToken: GetToken,
  id: string,
): Promise<LearnRecord & { child: Child }> {
  return call(getToken, `/parent/children/${encodeURIComponent(id)}/skills`);
}

export async function getSwitches(getToken: GetToken): Promise<ParentSwitches> {
  return (await call<{ switches: ParentSwitches }>(getToken, '/parent/switches')).switches;
}

export async function setSwitch(
  getToken: GetToken,
  key: keyof ParentSwitches,
  value: boolean,
): Promise<ParentSwitches> {
  return (await call<{ switches: ParentSwitches }>(getToken, '/parent/switches', { [key]: value }))
    .switches;
}

/** A signed-in parent writing to us: typed text is allowed here and only here (the server checks the age band). */
export async function sendGrownUpMessage(
  getToken: GetToken,
  input: { type: 'feedback' | 'question' | 'idea' | 'problem'; message: string; email?: string },
): Promise<void> {
  await call<unknown>(getToken, '/feedback', { ...input, presets: [] });
}

/** A parent signing in here is a grown-up, so their profile may use typed fields. Safe to repeat. */
export async function confirmGrownUp(getToken: GetToken): Promise<void> {
  await call<unknown>(getToken, '/me/age-band', { band: '18_plus' }).catch(() => undefined);
}
