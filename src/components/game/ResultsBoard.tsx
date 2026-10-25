import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { NicknamePicker } from '@/components/game/NicknamePicker';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { Board } from '@/types/domain';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { sectionLinkClass } from '@/components/ui/cardClasses';
import { t } from '@/i18n';

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
    <Card as="section" className="mt-8">
      <SectionHeading
        className="mb-4"
        action={
          <Link
            to={board === 'daily' ? '/leaderboards?board=daily' : `/leaderboards?quiz=${quizSlug}`}
            className={sectionLinkClass}
          >
            {t.results.board.seeAll}
            <span aria-hidden="true">→</span>
          </Link>
        }
      >
        {board === 'daily' ? t.results.board.daily : t.results.board.allTime}
      </SectionHeading>

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
          {t.common.loading}
        </p>
      )}
      {error && (
        <p role="alert" className="text-content">
          {error}
        </p>
      )}
      {data && <LeaderboardTable data={data} showMe={named} />}
    </Card>
  );
}
