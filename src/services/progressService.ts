import { supabase } from '@/lib/supabase';
import type { Attempt, Profile } from '@/types';

export type ProgressProfile = Pick<Profile, 'nickname' | 'streak_current'>;
export type ProgressAttempt = Pick<
  Attempt,
  'id' | 'quiz_id' | 'correct_count' | 'answered_count' | 'answer_time_ms' | 'finished_at'
>;
export interface PlayerProgress {
  profile: ProgressProfile | null;
  attempts: ProgressAttempt[];
}
export async function getPlayerProgress(
  userId: string,
  signal: AbortSignal,
): Promise<PlayerProgress> {
  const [profile, attempts] = await Promise.all([
    supabase
      .from('profiles')
      .select('nickname,streak_current')
      .eq('id', userId)
      .abortSignal(signal)
      .maybeSingle(),
    supabase
      .from('attempts')
      .select('id,quiz_id,correct_count,answered_count,answer_time_ms,finished_at')
      .eq('user_id', userId)
      .eq('status', 'finished')
      .order('finished_at', { ascending: false })
      .limit(20)
      .abortSignal(signal),
  ]);
  if (profile.error) throw profile.error;
  if (attempts.error) throw attempts.error;
  return { profile: profile.data, attempts: attempts.data ?? [] };
}
