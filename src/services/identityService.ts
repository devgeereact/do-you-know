import { supabase } from '@/lib/supabase';
import type { AgeBand, Profile } from '@/types';
export type PlayerIdentity = Pick<Profile, 'nickname' | 'age_band'>;
export async function getIdentity(
  userId: string,
  signal: AbortSignal,
): Promise<PlayerIdentity | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname,age_band')
    .eq('id', userId)
    .abortSignal(signal)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function setAgeBand(band: AgeBand): Promise<void> {
  const { error } = await supabase.rpc('set_age_band', { p_band: band });
  if (error) throw error;
}
export async function shuffleNickname(): Promise<string> {
  const { data, error } = await supabase.rpc('assign_random_nickname');
  if (error) throw error;
  return data;
}
