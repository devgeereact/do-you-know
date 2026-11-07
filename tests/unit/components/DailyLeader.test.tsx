import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DailyLeader } from '@/components/game/DailyLeader';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import type { Leaderboard, LeaderboardRow } from '@/types/game';

const row = (overrides: Partial<LeaderboardRow> = {}): LeaderboardRow => ({
  rank: 1,
  nickname: 'Brave Otter',
  avatar_id: null,
  correct: 9,
  total: 10,
  answer_time_ms: 41_000,
  achieved_at: '2026-11-07T10:00:00Z',
  is_me: false,
  entry_id: 'e1',
  likes: 0,
  liked_by_me: false,
  ...overrides,
});

describe('DailyLeader', () => {
  it('shows the top score and who holds the crown', () => {
    render(<DailyLeader leader={row()} playedToday={false} />);
    expect(screen.getByText('Brave Otter')).toBeInTheDocument();
    expect(screen.getByText('9/10')).toBeInTheDocument();
    expect(screen.getByText('Can you beat 9/10 and win the crown?')).toBeInTheDocument();
  });

  it('tells a player who has already played to catch the leader', () => {
    render(<DailyLeader leader={row()} playedToday />);
    expect(screen.getByText('Catch Brave Otter to win the crown.')).toBeInTheDocument();
  });

  it('tells the leader to keep the crown', () => {
    render(<DailyLeader leader={row({ is_me: true })} playedToday />);
    expect(screen.getByText('That’s you! Keep the crown.')).toBeInTheDocument();
  });

  it.each([[undefined], [row({ correct: 0 })]])(
    'has no crown yet when nobody has scored',
    (leader) => {
      render(<DailyLeader leader={leader} playedToday={false} />);
      expect(screen.getByText('No crown yet. Be the first on the board!')).toBeInTheDocument();
    },
  );
});

describe('the crown on today’s board', () => {
  const board = (rows: LeaderboardRow[]): Leaderboard => ({ top: rows, me: null });

  it('goes to rank 1 only, and says so for screen readers', () => {
    render(
      <LeaderboardTable
        data={board([row(), row({ rank: 2, nickname: 'Quick Fox', entry_id: 'e2', correct: 8 })])}
        board="daily"
      />,
    );
    expect(screen.getAllByText('Today’s leader')).toHaveLength(1);
  });

  it('is not worn for a zero score', () => {
    render(<LeaderboardTable data={board([row({ correct: 0 })])} board="daily" />);
    expect(screen.queryByText('Today’s leader')).not.toBeInTheDocument();
  });

  it('is only for the daily board', () => {
    render(<LeaderboardTable data={board([row()])} board="weekly" />);
    expect(screen.queryByText('Today’s leader')).not.toBeInTheDocument();
  });
});
