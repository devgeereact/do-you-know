import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Character } from '@/components/art/Art';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { useSession } from '@/hooks/useSession';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { reportError } from '@/lib/sentry';
import { cn } from '@/lib/utils';
import { getOverallBoard } from '@/services/gameService';
import type { OverallBoard, OverallPeriod, OverallRow } from '@/types/game';
import { t } from '@/i18n';

const PERIODS: OverallPeriod[] = ['day', 'week', 'month', 'all'];
const isPeriod = (v: string | null): v is OverallPeriod => PERIODS.includes(v as OverallPeriod);

function useOverall(period: OverallPeriod): {
  board: OverallBoard | null;
  error: boolean;
  loading: boolean;
} {
  const { user, loading: authLoading } = useSession();
  const [board, setBoard] = useState<OverallBoard | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (authLoading) return;
    let live = true;
    setLoading(true);
    setError(false);
    getOverallBoard(period, 100)
      .then((b) => live && setBoard(b))
      .catch((e: unknown) => {
        if (!live) return;
        reportError(e, { area: 'leaderboard:overall' });
        setError(true);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [period, user?.id, authLoading]);
  return { board, error, loading };
}

/**
 * Leaderboards. One board across every subject (Today first, then week, month, all time),
 * fitted to one screen: the podium and your summary on the left, the ranked list scrolling
 * inside its card on the right. A quiz's own board is still here at ?quiz=<slug>.
 */
export function LeaderboardsPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const quizSlug = params.get('quiz');
  useDocumentMeta({ title: t.leaderboards.title, description: t.leaderboards.metaDescription });
  return quizSlug ? (
    <QuizBoard slug={quizSlug} onClose={() => setParams({}, { replace: true })} />
  ) : (
    <Overall params={params} setParams={setParams} />
  );
}

function Overall({
  params,
  setParams,
}: {
  params: URLSearchParams;
  setParams: ReturnType<typeof useSearchParams>[1];
}): JSX.Element {
  const periodParam = params.get('period');
  const period: OverallPeriod = isPeriod(periodParam) ? periodParam : 'day';
  const [how, setHow] = useState(false);
  const { board, error, loading } = useOverall(period);
  const rows = board?.rows ?? [];
  const me = board?.me ?? rows.find((r) => r.is_me) ?? null;
  const ahead = me && me.rank > 1 ? rows.find((r) => r.rank === me.rank - 1) : null;
  const periodName = t.leaderboards.periods[period];

  const list = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.from('[data-orow]', { y: 10, duration: 0.3, stagger: 0.02, ease: 'power2.out' });
        gsap.from('[data-pod]', { y: 18, duration: 0.4, stagger: 0.06, ease: 'back.out(1.6)' });
      });
    },
    { scope: list, dependencies: [period, rows.length] },
  );

  return (
    <main
      ref={list}
      className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 px-4 py-3 lg:px-6 lg:py-5"
    >
      <div className="flex flex-none flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.7rem] leading-tight lg:text-[2rem]">{t.leaderboards.title}</h1>
          <p className="text-sm text-content-muted">
            {t.leaderboards.playersIn(rows.length, period)}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <SegmentedControl
            label={t.leaderboards.periodLabel}
            options={PERIODS.map((p) => ({ value: p, label: t.leaderboards.periods[p] }))}
            value={period}
            onChange={(p) => setParams({ period: p }, { replace: true })}
            className="w-full lg:w-[30rem]"
          />
          <button
            type="button"
            aria-expanded={how}
            onClick={() => setHow((v) => !v)}
            className={buttonClasses('ghost', 'sm', 'hidden lg:inline-flex')}
          >
            {t.leaderboards.howOpen}
          </button>
        </div>
      </div>
      {how && (
        <p className="flex-none rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm">
          {t.leaderboards.how}
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[23rem_minmax(0,1fr)] lg:grid-rows-1 lg:gap-5">
        <section className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-surface-border bg-surface p-4 shadow-soft">
          <Podium rows={rows} />
          {board && board.facts.rounds > 0 && (
            <dl className="hidden grid-cols-2 gap-2 [@media(min-height:800px)]:grid">
              <p className="col-span-2 text-xs font-bold uppercase tracking-widest text-content-muted">
                {t.leaderboards.factsTitle(periodName)}
              </p>
              <Fact
                value={board.facts.rounds.toLocaleString(t.locale)}
                label={t.leaderboards.facts.rounds}
              />
              <Fact
                value={board.facts.accuracy === null ? '–' : `${board.facts.accuracy}%`}
                label={t.leaderboards.facts.right}
              />
              <Fact
                value={board.facts.top_category?.name ?? '–'}
                label={t.leaderboards.facts.topSubject}
              />
              <Fact
                value={
                  board.facts.gap === null
                    ? '–'
                    : board.facts.gap === 0
                      ? t.leaderboards.tied
                      : t.leaderboards.points(board.facts.gap)
                }
                label={t.leaderboards.facts.gap}
              />
            </dl>
          )}
          <div className="mt-auto hidden gap-2.5 rounded-2xl bg-background p-3.5 lg:grid">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-content-muted">
                {t.leaderboards.you} · {periodName}
              </span>
              {me && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {t.leaderboards.youOf(me.rank, rows.length)}
                </span>
              )}
            </div>
            {me ? (
              <>
                <dl className="grid grid-cols-3 gap-2">
                  <Fact value={me.points} label={t.leaderboards.youStats.points} />
                  <Fact value={`${me.accuracy}%`} label={t.leaderboards.youStats.right} />
                  <Fact value={me.quizzes} label={t.leaderboards.youStats.quizzes} />
                </dl>
                <p className="text-sm">
                  {ahead
                    ? t.leaderboards.youPass(ahead.points - me.points + 10, ahead.nickname)
                    : t.leaderboards.youTop}
                </p>
              </>
            ) : (
              <p className="text-sm">{t.leaderboards.notOnBoard}</p>
            )}
            <Link to="/daily/play" className={buttonClasses('play', 'sm', 'w-full')}>
              {t.nav.play.label}
            </Link>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-surface-border bg-surface p-3 shadow-soft">
          <div
            aria-hidden="true"
            className="grid grid-cols-[2rem_2.25rem_minmax(0,1fr)_4.5rem_4rem] gap-2.5 border-b border-surface-border px-2 pb-2 text-[0.7rem] font-bold uppercase tracking-wider text-content-muted lg:grid-cols-[2rem_2.25rem_minmax(0,1fr)_5rem_4rem_4rem]"
          >
            <span>{t.leaderboards.columns.rank}</span>
            <span />
            <span>{t.leaderboards.columns.player}</span>
            <span className="text-right">{t.leaderboards.columns.points}</span>
            <span className="text-right">{t.leaderboards.columns.right}</span>
            <span className="hidden text-right lg:block">{t.leaderboards.columns.rounds}</span>
          </div>
          <ol
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            aria-label={t.leaderboards.title}
          >
            {error && <li className="p-4 text-content-muted">{t.leaderboards.loadError}</li>}
            {loading && !board && (
              <li role="status" className="p-4 text-content-muted">
                {t.common.loading}
              </li>
            )}
            {board && rows.length === 0 && (
              <li className="p-4 text-content-muted">{t.leaderboards.emptyBoard}</li>
            )}
            {board && rows.length > 0 && rows.length <= 3 && (
              <li className="p-4 text-content-muted">{t.leaderboards.onlyThree}</li>
            )}
            {rows.slice(3).map((row) => (
              <OverallLine key={`${row.rank}-${row.nickname}`} row={row} />
            ))}
          </ol>
          {me && me.rank > 3 && !rows.slice(3, 12).some((r) => r.is_me) && (
            <div className="mt-1 border-t border-dashed border-surface-border pt-1">
              <OverallLine row={me} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Fact({ value, label }: { value: string | number; label: string }): JSX.Element {
  return (
    <div className="grid min-w-0 rounded-xl bg-background px-3 py-2">
      <dt className="order-2 text-xs font-semibold text-content-muted">{label}</dt>
      <dd className="truncate font-display text-lg font-extrabold leading-tight">{value}</dd>
    </div>
  );
}

function Podium({ rows }: { rows: OverallRow[] }): JSX.Element {
  if (rows.length === 0) {
    return (
      <div className="grid flex-1 place-items-center gap-3 py-6 text-center">
        <div aria-hidden="true" className="flex items-end gap-1">
          <Character name="rocket" size={64} />
          <Character name="star" size={88} />
          <Character name="owl" size={64} />
        </div>
        <p className="max-w-[26ch] font-semibold text-content-muted">{t.leaderboards.emptyBoard}</p>
      </div>
    );
  }
  const slots: { row: OverallRow | undefined; place: 1 | 2 | 3; colour: string; height: string }[] =
    [
      { row: rows[1], place: 2, colour: 'bg-sky', height: 'h-12' },
      { row: rows[0], place: 1, colour: 'bg-tang', height: 'h-[4.5rem]' },
      { row: rows[2], place: 3, colour: 'bg-gum', height: 'h-8' },
    ];
  return (
    <ol
      className="grid grid-cols-[1fr_1.15fr_1fr] items-end gap-2 text-center"
      aria-label={t.leaderboards.title}
    >
      {slots.map(({ row, place, colour, height }) => (
        <li key={place} data-pod className="min-w-0">
          {row ? (
            <>
              {place === 1 && (
                <svg
                  className="mx-auto -mb-1 block"
                  width="36"
                  height="24"
                  viewBox="0 0 44 30"
                  aria-hidden="true"
                >
                  <path
                    d="M4 26 L2 6 L13 15 L22 2 L31 15 L42 6 L40 26Z"
                    fill="#FFD23F"
                    stroke="#E8B500"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span
                className={cn(
                  'mx-auto mb-1.5 block w-fit rounded-full ring-[3px] ring-offset-2 ring-offset-surface',
                  place === 1 ? 'ring-tang' : place === 2 ? 'ring-sky' : 'ring-gum',
                )}
              >
                <AvatarBadge
                  avatarId={row.avatar_id}
                  nickname={row.nickname}
                  size={place === 1 ? 'md' : 'sm'}
                />
              </span>
              <span className="block truncate text-sm font-bold">
                {row.nickname}
                {row.is_me && <span className="sr-only"> ({t.common.you})</span>}
              </span>
              <span className="block font-display text-lg font-extrabold leading-none">
                {row.points.toLocaleString(t.locale)}
              </span>
              <span className="block text-xs text-content-muted">
                {t.leaderboards.rightPct(row.accuracy)}
              </span>
              <span
                className={cn(
                  'mt-1.5 hidden place-items-center rounded-t-xl font-display text-2xl font-extrabold text-white lg:grid',
                  colour,
                  height,
                )}
              >
                {place}
              </span>
            </>
          ) : (
            <span className="block h-20" />
          )}
        </li>
      ))}
    </ol>
  );
}

function OverallLine({ row }: { row: OverallRow }): JSX.Element {
  return (
    <li
      data-orow
      className={cn(
        'grid grid-cols-[2rem_2.25rem_minmax(0,1fr)_4.5rem_4rem] items-center gap-2.5 rounded-xl px-2 py-2 [&+&]:border-t [&+&]:border-surface-border lg:grid-cols-[2rem_2.25rem_minmax(0,1fr)_5rem_4rem_4rem]',
        row.is_me && 'border-[1.5px] border-content bg-secondary/25',
      )}
    >
      <span className="text-center font-bold tabular-nums text-content-muted">{row.rank}</span>
      <AvatarBadge avatarId={row.avatar_id} nickname={row.nickname} size="xs" />
      <span className="truncate font-bold">
        {row.nickname}
        {row.is_me && (
          <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[0.65rem] font-bold text-secondary-fg">
            {t.common.you}
          </span>
        )}
      </span>
      <span className="text-right font-bold tabular-nums">
        {row.points.toLocaleString(t.locale)}
        <small className="block text-[0.7rem] font-semibold text-content-muted">
          {t.leaderboards.pointsShort}
        </small>
      </span>
      <span className="text-right font-bold tabular-nums">
        {row.accuracy}%
        <small className="block text-[0.7rem] font-semibold text-content-muted">
          {t.leaderboards.right}
        </small>
      </span>
      <span className="hidden text-right font-bold tabular-nums lg:block">
        {row.rounds}
        <small className="block text-[0.7rem] font-semibold text-content-muted">
          {t.leaderboards.roundsWord(row.rounds)}
        </small>
      </span>
    </li>
  );
}

/** One quiz's own all-time board (linked from a quiz page). */
function QuizBoard({ slug, onClose }: { slug: string; onClose: () => void }): JSX.Element {
  const { quizzes } = useQuizCatalog();
  const quiz = quizzes.find((q) => q.slug === slug);
  const { data, error } = useLeaderboard(slug, 'all_time', 50);
  return (
    <main className="mx-auto flex h-full w-full max-w-3xl flex-col gap-3 px-4 py-3 lg:py-5">
      <div className="flex flex-none items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.7rem] leading-tight">{quiz?.title ?? t.leaderboards.title}</h1>
          <p className="text-sm text-content-muted">{t.leaderboards.tabs.all_time}</p>
        </div>
        <button type="button" onClick={onClose} className={buttonClasses('ghost', 'sm')}>
          {t.daily.allSubjects}
        </button>
      </div>
      <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-surface-border bg-surface p-3 shadow-soft">
        {data ? (
          <LeaderboardTable data={data} board="all_time" />
        ) : error ? (
          <p className="p-3 text-content-muted">{t.leaderboards.loadError}</p>
        ) : (
          <p role="status" className="p-3 text-content-muted">
            {t.common.loading}
          </p>
        )}
      </section>
    </main>
  );
}
