import { useEffect, useRef, useState } from 'react';
import { AvatarBadge } from '@/components/AvatarBadge';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { gameErrorMessage } from '@/lib/gameErrors';
import { setLike } from '@/services/gameService';
import type { Board } from '@/types/domain';
import type { Leaderboard } from '@/types/game';
import { t } from '@/i18n';

interface LeaderboardTableProps {
  data: Leaderboard;
  board?: Board; // when set, players can like other people's rows
  emptyText?: string;
  showMe?: boolean; // false while the player has no nickname (they are not on the board yet)
}

// The podium gets a coloured disc; the number itself is always the signal.
const RANK_STYLE: Record<number, string> = {
  1: 'bg-secondary text-secondary-fg',
  2: 'bg-sky/30 text-content',
  3: 'bg-avatar-fox text-content',
};

/** Ranked rows: nickname, avatar, score and time only. Never ids or emails. */
export function LeaderboardTable({
  data,
  board,
  emptyText = t.leaderboards.table.empty,
  showMe = true,
}: LeaderboardTableProps): JSX.Element {
  // Like state is kept per entry so a tap shows at once; the server's total replaces it.
  const [likes, setLikes] = useState<Record<string, { n: number; mine: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);
  useEffect(() => setLikes({}), [data]);

  async function toggleLike(entryId: string, now: { n: number; mine: boolean }): Promise<void> {
    if (!board || busy) return;
    setBusy(entryId);
    setLikeError(null);
    try {
      const result = await setLike(board, entryId, !now.mine);
      setLikes((prev) => ({ ...prev, [entryId]: { n: result.likes, mine: result.liked_by_me } }));
    } catch (err) {
      setLikeError(gameErrorMessage(err as { message?: string }));
    } finally {
      setBusy(null);
    }
  }

  const meInTop = data.top.some((row) => row.is_me);

  // Rows rise in, top first, whenever a board loads or changes. Opacity and transform only.
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.fromTo(
          '[data-board-row]',
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out', overwrite: true },
        );
      });
    },
    { scope: root, dependencies: [data] },
  );

  if (data.top.length === 0 && !(showMe && data.me)) {
    return <p className="py-6 text-center text-content-muted">{emptyText}</p>;
  }

  return (
    <div ref={root}>
      <ol className="grid gap-2">
        {data.top.map((row) => (
          <li
            key={`${row.rank}-${row.nickname}-${row.achieved_at}`}
            data-board-row
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 px-3 py-3 sm:px-4',
              row.is_me ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface',
            )}
          >
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-lg font-semibold tabular-nums',
                RANK_STYLE[row.rank] ?? 'text-content-muted',
              )}
            >
              <span className="sr-only">{t.leaderboards.table.rank}</span>
              {row.rank}
            </span>
            <AvatarBadge avatarId={row.avatar_id} nickname={row.nickname} />
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate font-semibold text-content">{row.nickname}</span>
              {row.is_me && (
                <span className="shrink-0 text-sm font-bold text-primary">{t.common.you}</span>
              )}
            </span>
            {(() => {
              const like = likes[row.entry_id] ?? { n: row.likes, mine: row.liked_by_me };
              const label = like.mine
                ? t.leaderboards.table.unlike(row.nickname)
                : t.leaderboards.table.like(row.nickname);
              return board && !row.is_me ? (
                <button
                  type="button"
                  aria-pressed={like.mine}
                  aria-label={label}
                  title={label}
                  disabled={busy === row.entry_id}
                  onClick={() => void toggleLike(row.entry_id, like)}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-sm font-bold tabular-nums',
                    like.mine
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-surface-border text-content-muted hover:border-primary',
                  )}
                >
                  <span aria-hidden="true">{like.mine ? '♥' : '♡'}</span>
                  <span>{like.n}</span>
                </button>
              ) : like.n > 0 ? (
                <span className="shrink-0 text-sm font-bold tabular-nums text-content-muted">
                  <span aria-hidden="true">♥ </span>
                  {t.leaderboards.table.likeCount(like.n)}
                </span>
              ) : null;
            })()}
            <span className="shrink-0 text-right">
              <span className="block font-display text-lg font-semibold tabular-nums text-content">
                {row.correct}/{row.total}
              </span>
              <span className="block text-xs text-content-muted">
                {t.common.seconds(row.answer_time_ms)}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {likeError && (
        <p role="alert" className="mt-3 text-center text-content-muted">
          {likeError}
        </p>
      )}
      {showMe && data.me && !meInTop && (
        <p className="mt-3 rounded-xl border-2 border-dashed border-surface-border bg-surface px-4 py-3 text-center text-content">
          {data.me.rank !== null ? (
            <>
              {t.leaderboards.table.youAre}{' '}
              <strong>{t.leaderboards.table.rankNumber(data.me.rank)}</strong>{' '}
              {t.leaderboards.table.withScore(data.me.correct, data.me.total)}
            </>
          ) : (
            t.leaderboards.table.yourBest(data.me.correct, data.me.total)
          )}
        </p>
      )}
    </div>
  );
}
