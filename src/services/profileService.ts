import { supabase } from '@/lib/supabase';
import type { Profile, ProfileUpdate } from '@/types';

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

/** The RPC derives ownership from auth.uid(), never a caller-supplied ID. */
export async function deleteAccount(expectedUserId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.user.id !== expectedUserId) throw new Error('account_changed');
  const result = await supabase.rpc('delete_my_account');
  if (result.error) throw result.error;
}

/** Keep cleanup retry separate: a confirmed deletion must never be sent twice. */
export async function clearDeletedSession(expectedUserId: string): Promise<void> {
  const before = await supabase.auth.getSession();
  if (before.error) throw before.error;
  if (!before.data.session || before.data.session.user.id !== expectedUserId) return;
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  // A deleted user's logout endpoint can fail after local storage was cleared.
  const after = await supabase.auth.getSession();
  if (after.error) throw after.error;
  if (after.data.session?.user.id === expectedUserId) {
    throw error ?? new Error('session_not_cleared');
  }
}
