import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { NicknamePicker } from '@/components/game/NicknamePicker';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { Board } from '@/types/domain';

interface ResultsBoardProps {
  quizSlug: string;
  board: Extract<Board, 'all_time' | 'daily'>;
  needsNickname: boolean;
}

/**
 * The leaderboard under a ranked or daily result. Players without a nickname
 * pick one first; the board then reloads so "your rank" appears.
 */
export function ResultsBoard({ quizSlug, board, needsNickname }: ResultsBoardProps): JSX.Element {
  const [named, setNamed] = useState(!needsNickname);
  const { data, loading, error, refresh } = useLeaderboard(
    board === 'daily' ? null : quizSlug,
    board,
    5,
  );

  return (
    <section className="mt-8 rounded-2xl border-2 border-surface-border bg-surface p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold text-content">
          {board === 'daily' ? "Today's leaderboard" : 'Leaderboard'}
        </h2>
        <Link
          to={board === 'daily' ? '/leaderboards?board=daily' : `/leaderboards?quiz=${quizSlug}`}
          className="inline-flex min-h-tap items-center text-sm font-semibold text-primary underline underline-offset-2"
        >
          See all
        </Link>
      </div>

      {!named && (
        <div className="mb-6 rounded-xl bg-background p-5">
          <NicknamePicker
            onDone={() => {
              setNamed(true);
              void refresh();
            }}
          />
        </div>
      )}

      {loading && !data && (
        <p role="status" className="text-content-muted">
          Loading…
        </p>
      )}
      {error && (
        <p role="alert" className="text-content">
          {error}
        </p>
      )}
      {data && <LeaderboardTable data={data} showMe={named} />}
    </section>
  );
}
