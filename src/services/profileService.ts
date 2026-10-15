import { supabase } from '@/lib/supabase';
import type { AgeBand, Profile, ProfileUpdate } from '@/types';

/** Fetch the current user's profile (RLS restricts this to their own row). */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Patch the current user's profile. */
export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/*
 * Protected profile actions. Age band, nickname and consent can only change
 * through these RPCs (a trigger blocks direct updates to those columns).
 */

/** Sets the age band once; the server refuses a change afterwards. */
export async function setAgeBand(band: AgeBand): Promise<void> {
  const { error } = await supabase.rpc('set_age_band', { p_band: band });
  if (error) throw error;
}

/** A friendly generated nickname such as "BraveOtter42". The only option for under-13s. */
export async function assignRandomNickname(): Promise<string> {
  const { data, error } = await supabase.rpc('assign_random_nickname');
  if (error) throw error;
  return data as string;
}

/** A chosen nickname (13+ only), checked against the blocked-words list. */
export async function setNickname(nickname: string): Promise<string> {
  const { data, error } = await supabase.rpc('set_nickname', { p_nickname: nickname });
  if (error) throw error;
  return data as string;
}

export async function confirmParentalConsent(): Promise<void> {
  const { error } = await supabase.rpc('confirm_parental_consent');
  if (error) throw error;
}

/** Removes the account; profile, attempts, avatars and board rows cascade. */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  // The user no longer exists server-side, so only clear this device's session.
  await supabase.auth.signOut({ scope: 'local' });
}
