import { supabase } from '@/lib/supabase';
import type { Board } from '@/types';
import type { Leaderboard } from '@/types/game';

export async function getLeaderboard(
  quizSlug: string | null,
  board: Board,
  limit: number,
  signal: AbortSignal,
): Promise<Leaderboard> {
  const { data, error } = await supabase
    .rpc('get_leaderboard', {
      p_quiz_slug: quizSlug,
      p_board: board,
      p_limit: limit,
    })
    .abortSignal(signal);
  if (error) throw error;
  return data as unknown as Leaderboard;
}
