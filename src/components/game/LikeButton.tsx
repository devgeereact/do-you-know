import { useEffect, useState } from 'react';
import { gameErrorMessage } from '@/lib/gameErrors';
import { cn } from '@/lib/utils';
import { setLike } from '@/services/gameService';
import type { Board } from '@/types/domain';
import { t } from '@/i18n';

interface LikeButtonProps {
  board: Board;
  entryId: string;
  nickname: string;
  likes: number;
  likedByMe: boolean;
  onError: (message: string | null) => void;
}

/** Heart toggle for another player's leaderboard row. Shows totals only, never who liked. */
export function LikeButton({
  board,
  entryId,
  nickname,
  likes,
  likedByMe,
  onError,
}: LikeButtonProps): JSX.Element {
  const [state, setState] = useState({ likes, liked: likedByMe });
  const [busy, setBusy] = useState(false);

  // A reloaded board brings fresh totals from the server.
  useEffect(() => {
    setState({ likes, liked: likedByMe });
  }, [likes, likedByMe]);

  async function toggle(): Promise<void> {
    if (busy) return;
    setBusy(true);
    onError(null);
    try {
      const result = await setLike(board, entryId, !state.liked);
      setState({ likes: result.likes, liked: result.liked_by_me });
    } catch (err) {
      onError(gameErrorMessage(err as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  const label = state.liked
    ? t.leaderboards.table.unlike(nickname)
    : t.leaderboards.table.like(nickname);
  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={() => void toggle()}
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-sm font-bold tabular-nums',
        state.liked
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-surface-border text-content-muted hover:border-primary',
      )}
    >
      <span aria-hidden="true">{state.liked ? '♥' : '♡'}</span>
      <span>{state.likes}</span>
    </button>
  );
}
