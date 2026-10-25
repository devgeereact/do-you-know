import { useSearchParams } from 'react-router-dom';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { Board } from '@/types/domain';
import { Page } from '@/components/ui/Page';
import { t } from '@/i18n';

const TABS: { board: Board; label: string }[] = [
  { board: 'all_time', label: t.leaderboards.tabs.all_time },
  { board: 'weekly', label: t.leaderboards.tabs.weekly },
  { board: 'daily', label: t.leaderboards.tabs.daily },
];

function isBoard(value: string | null): value is Board {
  return value === 'all_time' || value === 'weekly' || value === 'daily';
}

export function LeaderboardsPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const boardParam = params.get('board');
  const board: Board = isBoard(boardParam) ? boardParam : 'all_time';
  const { quizzes, loading: catalogLoading, error: catalogError } = useQuizCatalog();
  const ranked = quizzes.filter((q) => q.is_ranked);
  const quizSlug = params.get('quiz') ?? ranked[0]?.slug ?? null;

  const { data, loading, error } = useLeaderboard(board === 'daily' ? null : quizSlug, board, 50);

  useDocumentMeta({
    title: t.leaderboards.title,
    description: t.leaderboards.metaDescription,
  });

  const update = (key: 'board' | 'quiz', value: string): void => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <Page>
        <PageHeader title={t.leaderboards.title} lead={t.leaderboards.lead} />

        <SegmentedControl
          label={t.leaderboards.boardLabel}
          options={TABS.map((tab) => ({ value: tab.board, label: tab.label }))}
          value={board}
          onChange={(value) => update('board', value)}
          className="w-full max-w-lg"
        />

        {board !== 'daily' && ranked.length > 0 && (
          <label className="mt-5 flex flex-col gap-1 text-sm font-bold text-content-muted sm:flex-row sm:items-center sm:gap-3">
            {t.leaderboards.quizLabel}
            <select
              value={quizSlug ?? ''}
              onChange={(e) => update('quiz', e.target.value)}
              className="min-h-tap flex-1 rounded-full border-2 border-surface-border bg-surface px-4 text-base font-semibold text-content focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary"
            >
              {ranked.map((q) => (
                <option key={q.id} value={q.slug}>
                  {q.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-8">
          {(loading || catalogLoading) && !data && (
            <p role="status" className="text-content-muted">
              {t.common.loading}
            </p>
          )}
          {(error ?? catalogError) && (
            <p role="alert" className="text-content">
              {error ?? catalogError}
            </p>
          )}
          {board !== 'daily' && !catalogLoading && !catalogError && ranked.length === 0 && (
            <p className="text-content-muted">{t.leaderboards.noRanked}</p>
          )}
          {data && (
            <LeaderboardTable
              data={data}
              emptyText={board === 'daily' ? t.leaderboards.dailyEmpty : t.leaderboards.table.empty}
            />
          )}
        </div>
      </Page>
    </>
  );
}
