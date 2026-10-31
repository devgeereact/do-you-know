import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { londonToday } from '@/lib/adminValidation';
import { cn } from '@/lib/utils';
import type { DailyDay } from '@/services/adminService';
import { niceDate, useAction, useLoad, useStudio } from '@/pages/admin/studio';
import { AHead, ErrorNote, Loading, Panel } from '@/pages/admin/ui';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function shiftMonth(month: string, by: number): string {
  const [y = 2026, m = 1] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

/** Plan the daily challenge: pick a live quiz, then click (or drop it on) a day. */
export function CalendarScreen(): JSX.Element {
  const { client, confirm, refreshCounts } = useStudio();
  const { busy, run } = useAction();
  const [month, setMonth] = useState(londonToday().slice(0, 7));
  const [pick, setPick] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const cal = useLoad(() => client.daily(month), [month]);
  const pool = useLoad(
    () =>
      client
        .quizzes({ status: 'published' })
        .then((list) =>
          list.filter((q) => !q.publish_at || new Date(q.publish_at).getTime() <= Date.now()),
        ),
    [],
  );

  const [y = 2026, m = 1] = month.split('-').map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const today = cal.data?.today ?? londonToday();

  const open = (d: DailyDay): boolean =>
    d.date >= today && d.status !== 'live' && d.status !== 'done';

  const place = async (d: DailyDay, quizId: string | null): Promise<void> => {
    const title = quizId ? pool.data?.find((q) => q.id === quizId)?.title : null;
    const ok = await confirm(
      quizId
        ? {
            title: `Daily on ${niceDate(d.date)}?`,
            body: `“${title ?? 'This quiz'}” becomes the daily challenge that day. Players will see it.`,
            confirmLabel: 'Set daily',
          }
        : {
            title: `Clear ${niceDate(d.date)}?`,
            body: 'The day goes back to the automatic pick.',
            confirmLabel: 'Clear day',
            tone: 'danger',
          },
    );
    if (!ok) return;
    const saved = await run(
      () => client.setDaily(d.date, quizId),
      quizId ? 'Daily set' : 'Day cleared',
    );
    if (saved && cal.data) {
      cal.setData({
        ...cal.data,
        days: cal.data.days.map((x) => (x.date === saved.date ? saved : x)),
      });
      refreshCounts();
    }
  };

  return (
    <>
      <AHead
        title="Daily calendar"
        lead="Drag a quiz onto a day, or pick one and click a day. Empty days use the automatic pick: the live quiz used least recently."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Panel as="aside" className="order-first min-w-0 self-start !p-3 lg:order-last">
          <b className="text-sm">Live quizzes</b>
          <p className="mb-2 mt-0.5 text-xs text-content-muted">
            Only live quizzes can be the daily.
          </p>
          {pool.loading && !pool.data ? (
            <Loading />
          ) : (
            <div className="flex gap-1.5 overflow-x-auto p-0.5 pb-1 lg:grid lg:max-h-[60vh] lg:grid-cols-1 lg:overflow-y-auto">
              {(pool.data ?? []).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  draggable
                  aria-pressed={pick === q.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', q.id);
                    setPick(q.id);
                  }}
                  onClick={() => setPick((p) => (p === q.id ? null : q.id))}
                  className={cn(
                    'flex min-w-0 max-w-[220px] shrink-0 cursor-grab items-center rounded-[10px] border-[1.5px] bg-surface px-2.5 py-2 text-left text-[13.5px] font-extrabold lg:w-full lg:max-w-none',
                    pick === q.id ? 'border-primary bg-primary/10' : 'border-surface-border',
                  )}
                >
                  <span className="truncate">{q.title}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
        <section className="min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Previous month"
              onClick={() => setMonth((v) => shiftMonth(v, -1))}
            >
              ‹
            </Button>
            <h2 className="font-display text-xl font-extrabold">{label}</h2>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Next month"
              onClick={() => setMonth((v) => shiftMonth(v, 1))}
            >
              ›
            </Button>
          </div>
          {cal.error ? (
            <ErrorNote message={cal.error} onRetry={cal.reload} />
          ) : !cal.data ? (
            <Loading />
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {DOW.map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-extrabold uppercase text-content-muted"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {cal.data.days.map((d) => {
                const can = open(d);
                const past = d.date < today;
                const n = Number(d.date.slice(8));
                const click = (): void => {
                  if (!can || busy) return;
                  if (!pick) return;
                  void place(d, pick);
                };
                return (
                  <div
                    key={d.date}
                    role={can ? 'button' : undefined}
                    tabIndex={can ? 0 : undefined}
                    aria-label={`${n} ${label}${d.title ? `, ${d.title}` : can ? ', automatic pick' : ''}`}
                    onClick={click}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        click();
                      }
                    }}
                    onDragOver={(e) => {
                      if (!can) return;
                      e.preventDefault();
                      setOverDay(d.date);
                    }}
                    onDragLeave={() => setOverDay(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOverDay(null);
                      const id = e.dataTransfer.getData('text/plain');
                      if (can && id) void place(d, id);
                    }}
                    className={cn(
                      'flex min-h-[62px] min-w-0 flex-col gap-1 rounded-[10px] border-[1.5px] bg-surface p-1 text-left text-xs sm:min-h-[84px] sm:p-1.5',
                      past && 'opacity-55',
                      d.date === today
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-surface-border',
                      overDay === d.date && 'border-dashed border-primary bg-primary/10',
                      can && pick && 'cursor-pointer hover:border-primary/60',
                    )}
                  >
                    <span className="font-extrabold">{n}</span>
                    {d.status === 'scheduled' && (
                      <span className="flex min-w-0 items-center justify-between gap-1 rounded-[7px] bg-secondary px-1 py-0.5 text-[10.5px] font-extrabold text-secondary-fg sm:px-1.5 sm:text-xs">
                        <span className="truncate">{d.title}</span>
                        <button
                          type="button"
                          aria-label={`Clear ${n} ${label}`}
                          className="shrink-0 px-0.5 font-black"
                          onClick={(e) => {
                            e.stopPropagation();
                            void place(d, null);
                          }}
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {(d.status === 'live' || d.status === 'done') && d.title && (
                      <span
                        className={cn(
                          'truncate rounded-[7px] px-1 py-0.5 text-[10.5px] font-extrabold sm:px-1.5 sm:text-xs',
                          d.status === 'live' ? 'bg-correct/15 text-correct' : 'bg-content/[0.06]',
                        )}
                      >
                        {d.title}
                      </span>
                    )}
                    {d.status === 'auto' && (
                      <span
                        className="truncate rounded-[7px] bg-content/[0.06] px-1 py-0.5 text-[10.5px] font-bold text-content-muted sm:px-1.5 sm:text-xs"
                        title={d.title ? `Automatic pick: ${d.title}` : undefined}
                      >
                        Auto pick
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!pick && (
            <p className="mt-2 text-xs text-content-muted">
              Pick a live quiz first, then click a day.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
