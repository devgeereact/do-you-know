import { supabase } from '@/lib/supabase';
import type { FriendChallengePreview, Quiz } from '@/types';
export interface DailyPreview {
  today: { date: string; quiz: Pick<Quiz, 'slug' | 'title' | 'cover_image_url'> } | null;
  played_today: boolean;
  streak: number;
}
export async function getDailyChallenge(signal: AbortSignal): Promise<DailyPreview> {
  const { data, error } = await supabase.rpc('get_daily_challenge').abortSignal(signal);
  if (error) throw error;
  return data as unknown as DailyPreview;
}
export async function getFriendChallenge(
  code: string,
  signal: AbortSignal,
): Promise<FriendChallengePreview | null> {
  const { data, error } = await supabase
    .rpc('get_friend_challenge', { p_code: code })
    .abortSignal(signal);
  if (error) throw error;
  return data as unknown as FriendChallengePreview | null;
}
export async function createFriendChallenge(attemptId: string): Promise<{ code: string }> {
  const { data, error } = await supabase.rpc('create_friend_challenge', {
    p_attempt_id: attemptId,
  });
  if (error) throw error;
  return data as unknown as { code: string };
}
