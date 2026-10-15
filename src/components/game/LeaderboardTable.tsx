import { cn, isWebUrl } from '@/lib/utils';
import type { Leaderboard, LeaderboardRow } from '@/types/game';

interface LeaderboardTableProps {
  data: Leaderboard;
  emptyText?: string;
  showMe?: boolean; // false while the player has no nickname (they are not on the board yet)
}

function seconds(ms: number): string {
  return `${(ms / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} s`;
}

function Avatar({ row }: { row: Pick<LeaderboardRow, 'nickname' | 'avatar_url'> }): JSX.Element {
  if (isWebUrl(row.avatar_url)) {
    return (
      <img
        src={row.avatar_url}
        alt=""
        loading="lazy"
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky/30 font-display font-semibold text-primary"
    >
      {row.nickname.charAt(0).toUpperCase()}
    </span>
  );
}

/** Ranked rows: nickname, avatar, score and time only. Never ids or emails. */
export function LeaderboardTable({
  data,
  emptyText = 'No one on this board yet. Be the first!',
  showMe = true,
}: LeaderboardTableProps): JSX.Element {
  const meInTop = data.top.some((row) => row.is_me);

  if (data.top.length === 0 && !(showMe && data.me)) {
    return <p className="py-6 text-center text-content-muted">{emptyText}</p>;
  }

  return (
    <div>
      <ol className="grid gap-2">
        {data.top.map((row) => (
          <li
            key={`${row.rank}-${row.nickname}-${row.achieved_at}`}
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 bg-surface px-4 py-3',
              row.is_me ? 'border-primary' : 'border-surface-border',
            )}
          >
            <span
              className={cn(
                'w-8 shrink-0 text-center font-display text-lg font-semibold',
                row.rank <= 3 ? 'text-content' : 'text-content-muted',
              )}
            >
              <span className="sr-only">Rank </span>
              {row.rank}
            </span>
            <Avatar row={row} />
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate font-semibold text-content">{row.nickname}</span>
              {row.is_me && <span className="shrink-0 text-sm font-bold text-primary">You</span>}
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-display text-lg font-semibold text-content">
                {row.correct}/{row.total}
              </span>
              <span className="block text-xs text-content-muted">
                {seconds(row.answer_time_ms)}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {showMe && data.me && !meInTop && (
        <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-center text-content">
          {data.me.rank !== null ? (
            <>
              You’re <strong>#{data.me.rank}</strong> with {data.me.correct}/{data.me.total}
            </>
          ) : (
            <>
              Your best: {data.me.correct}/{data.me.total}. Pick a nickname to appear on the board.
            </>
          )}
        </p>
      )}
    </div>
  );
}
