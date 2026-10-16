import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { SiteHeader } from '@/components/SiteHeader';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { cn } from '@/lib/utils';
import type { Board } from '@/types/domain';

const TABS: { board: Board; label: string }[] = [
  { board: 'all_time', label: 'All time' },
  { board: 'weekly', label: 'This week' },
  { board: 'daily', label: "Today's challenge" },
];

function isBoard(value: string | null): value is Board {
  return value === 'all_time' || value === 'weekly' || value === 'daily';
}

export function LeaderboardsPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const boardParam = params.get('board');
  const board: Board = isBoard(boardParam) ? boardParam : 'all_time';
  const { quizzes, loading: catalogLoading } = useQuizCatalog();
  const ranked = quizzes.filter((q) => q.is_ranked);
  const quizSlug = params.get('quiz') ?? ranked[0]?.slug ?? null;

  const { data, loading, error } = useLeaderboard(board === 'daily' ? null : quizSlug, board, 50);

  useEffect(() => {
    document.title = 'Leaderboards · Do You Know';
  }, []);

  const update = (key: 'board' | 'quiz', value: string): void => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4 md:px-8">
        <h1 className="text-4xl font-semibold text-content">Leaderboards</h1>
        <p className="mt-2 text-content-muted">
          Most correct wins. If it’s a tie, the faster answer time goes first.
        </p>

        <div role="group" aria-label="Board" className="mt-6 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.board}
              type="button"
              aria-pressed={board === tab.board}
              onClick={() => update('board', tab.board)}
              className={cn(
                'min-h-tap rounded-full border-2 px-4 font-semibold',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                board === tab.board
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-surface-border bg-surface text-content',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {board !== 'daily' && ranked.length > 0 && (
          <label className="mt-4 flex flex-col gap-1 text-sm font-bold text-content-muted sm:flex-row sm:items-center sm:gap-3">
            Quiz
            <select
              value={quizSlug ?? ''}
              onChange={(e) => update('quiz', e.target.value)}
              className="min-h-tap flex-1 rounded-full border-2 border-surface-border bg-surface px-4 text-base font-semibold text-content"
            >
              {ranked.map((q) => (
                <option key={q.id} value={q.slug}>
                  {q.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-6">
          {(loading || catalogLoading) && !data && (
            <p role="status" className="text-content-muted">
              Loading…
            </p>
          )}
          {error && (
            <p role="alert" className="text-content">
              {error}
            </p>
          )}
          {data && (
            <LeaderboardTable
              data={data}
              emptyText={
                board === 'daily'
                  ? 'No scores for today’s challenge yet. Be the first!'
                  : 'No one on this board yet. Be the first!'
              }
            />
          )}
        </div>
      </main>
    </>
  );
}
