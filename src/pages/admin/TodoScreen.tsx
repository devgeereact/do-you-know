import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { addDays, londonToday } from '@/lib/adminValidation';
import { cn } from '@/lib/utils';
import type { DailyDay, TodoKey } from '@/services/adminService';
import { NewQuizDialog } from '@/pages/admin/NewQuizDialog';
import {
  TONES,
  linkButtonClass,
  plural,
  useLoad,
  useStudio,
  weekdayLabel,
  type Tone,
} from '@/pages/admin/studio';
import {
  AHead,
  Empty,
  ErrorNote,
  Kpi,
  Loading,
  Panel,
  Pill,
  Table,
  Td,
  Tr,
} from '@/pages/admin/ui';

const NEEDS: Record<TodoKey, { title: string; to: string; tone: Tone }> = {
  feedback_new: { title: 'New messages in the inbox', to: '/admin/inbox', tone: 'bad' },
  draft_problems: {
    title: 'Drafts with problems',
    to: '/admin/library?status=draft',
    tone: 'bad',
  },
  review_questions: {
    title: 'Questions waiting for your check',
    to: '/admin/check',
    tone: 'warn',
  },
  review_due: {
    title: 'Facts due for a re-check within 30 days',
    to: '/admin/library?status=published',
    tone: 'warn',
  },
  hard_questions: {
    title: 'Questions most players get wrong',
    to: '#hardest',
    tone: 'bad',
  },
  daily_gaps: {
    title: 'Days in the next 2 weeks on automatic pick',
    to: '/admin/calendar',
    tone: 'grape',
  },
};
const ORDER: TodoKey[] = [
  'feedback_new',
  'draft_problems',
  'review_questions',
  'review_due',
  'hard_questions',
  'daily_gaps',
];

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' })
      .format(new Date())
      .slice(0, 2),
  );
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** The Studio home: KPIs, what needs the owner, the next week of dailies and the hardest questions. */
export function TodoScreen(): JSX.Element {
  const { client } = useStudio();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const today = londonToday();
  const { data, error, loading, reload } = useLoad(async () => {
    const thisMonth = today.slice(0, 7);
    const nextMonth = addDays(today, 6).slice(0, 7);
    const [todo, stats, quizzes, ...months] = await Promise.all([
      client.todo(),
      client.stats(),
      client.quizzes(),
      client.daily(thisMonth),
      ...(nextMonth !== thisMonth ? [client.daily(nextMonth)] : []),
    ]);
    const days = months.flatMap((m) => m.days);
    const next: DailyDay[] = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map(
      (date) =>
        days.find((d) => d.date === date) ?? {
          date,
          quiz_id: null,
          slug: null,
          title: null,
          status: 'auto',
        },
    );
    return { todo, stats, quizzes, next };
  }, []);

  const dateLine = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/London',
  });

  return (
    <>
      <AHead
        title={greeting()}
        lead={`${dateLine} · here’s what needs you`}
        actions={
          <>
            <Button size="sm" onClick={() => setCreating(true)}>
              New quiz
            </Button>
            <Link to="/admin/import" className={buttonClasses('ghost', 'sm')}>
              Import questions
            </Link>
          </>
        }
      />
      {creating && <NewQuizDialog onClose={() => setCreating(false)} />}
      {loading && !data ? (
        <Loading />
      ) : error || !data ? (
        <ErrorNote message={error ?? 'Could not load.'} onRetry={reload} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Plays today"
              value={data.stats.plays.today.toLocaleString('en-GB')}
              note={`${data.stats.plays.d30.toLocaleString('en-GB')} in 30 days`}
            />
            <Kpi
              label="Plays, 7 days"
              value={data.stats.plays.d7.toLocaleString('en-GB')}
              note={`Ranked ${data.stats.modes_7d.ranked} · Daily ${data.stats.modes_7d.daily}`}
            />
            <Kpi
              label="Rounds finished"
              value={data.stats.finish_rate_7d === null ? '–' : `${data.stats.finish_rate_7d}%`}
              note="Of rounds started, 7 days"
            />
            <Kpi
              label="New players"
              value={data.stats.new_guests_7d.toLocaleString('en-GB')}
              note="New guests, 7 days"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <Panel className="lg:col-span-7">
              <h2 className="mb-2.5 font-display text-xl font-extrabold">Needs you</h2>
              {ORDER.map((key) => data.todo.find((t) => t.key === key))
                .filter((t) => t && t.count > 0)
                .map((t) => {
                  if (!t) return null;
                  const need = NEEDS[t.key];
                  const go = (): void => {
                    if (need.to.startsWith('#')) {
                      document.getElementById(need.to.slice(1))?.scrollIntoView({
                        behavior: 'smooth',
                      });
                    } else navigate(need.to);
                  };
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={go}
                      className="mt-1.5 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-surface-border bg-surface px-3 py-2.5 text-left transition-colors first-of-type:mt-0 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40"
                    >
                      <span
                        className={cn(
                          'grid h-[34px] min-w-[34px] place-items-center rounded-[10px] px-1.5 font-display text-[17px] font-extrabold',
                          TONES[need.tone],
                        )}
                      >
                        {t.count}
                      </span>
                      <span className="min-w-0">
                        <b className="block text-[14.5px]">{need.title}</b>
                        <span className="block text-[13px] text-content-muted">
                          {t.key === 'daily_gaps'
                            ? 'Fine to leave. Plan them if you want a theme'
                            : t.key === 'hard_questions'
                              ? 'Could be too hard, or the marked answer could be wrong'
                              : t.label}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-primary">Open ›</span>
                    </button>
                  );
                })}
              {data.todo.every((t) => t.count === 0) && (
                <Empty>All clear. Nothing needs you today.</Empty>
              )}
            </Panel>
            <Panel className="lg:col-span-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-extrabold">Next 7 dailies</h2>
                <Link to="/admin/calendar" className={linkButtonClass}>
                  Calendar
                </Link>
              </div>
              <ul>
                {data.next.map((d) => {
                  const planned = d.status === 'scheduled' || d.status === 'live';
                  return (
                    <li
                      key={d.date}
                      className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 border-t border-surface-border/70 py-[7px] text-sm"
                    >
                      <b>{weekdayLabel(d.date, today)}</b>
                      <span className="truncate text-center">
                        {d.title ?? <span className="text-content-muted">Least recently used</span>}
                      </span>
                      <Pill tone={planned ? 'lemon' : 'mute'}>
                        {d.status === 'live' ? 'Live' : planned ? 'Planned' : 'Auto'}
                      </Pill>
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel className="lg:col-span-12" id="hardest">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-extrabold">Hardest questions right now</h2>
                <span className="text-sm text-content-muted">
                  Low right-rate can mean a wrong answer key
                </span>
              </div>
              {data.stats.hardest.length === 0 ? (
                <Empty>Not enough answers yet to spot hard questions.</Empty>
              ) : (
                <Table
                  className="border-0 shadow-none"
                  label="Hardest questions"
                  head={[
                    { label: 'Question' },
                    { label: 'Quiz' },
                    { label: 'Answered', num: true },
                    { label: 'Right', num: true },
                    { label: '' },
                  ]}
                >
                  {data.stats.hardest.slice(0, 5).map((h) => {
                    const quiz = data.quizzes.find((q) => q.slug === h.quiz_slug);
                    return (
                      <Tr key={h.question_id}>
                        <Td label="Question" lead>
                          <b className="block [overflow-wrap:anywhere]">{h.prompt}</b>
                        </Td>
                        <Td label="Quiz">{h.quiz_title}</Td>
                        <Td label="Answered" num>
                          {plural(h.answered, 'answer', 'answers')}
                        </Td>
                        <Td label="Right" num>
                          <b className={h.right_rate < 30 ? 'text-wrong' : undefined}>
                            {h.right_rate}%
                          </b>
                        </Td>
                        <Td label="">
                          {quiz && (
                            <Link
                              to={`/admin/edit/${quiz.id}?q=${h.question_id}`}
                              className={buttonClasses('ghost', 'sm', 'h-9')}
                            >
                              Review
                            </Link>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Table>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
