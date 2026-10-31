import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { KEY_STAGES, type KeyStage, type QuizListItem } from '@/services/adminService';
import { NewQuizDialog } from '@/pages/admin/NewQuizDialog';
import {
  inputClass,
  niceDate,
  plural,
  quizState,
  selectClass,
  useLoad,
  useStudio,
} from '@/pages/admin/studio';
import {
  AHead,
  Empty,
  ErrorNote,
  Filters,
  Loading,
  Pill,
  SegList,
  Table,
  Td,
  Tr,
} from '@/pages/admin/ui';

type StatusFilter = 'all' | 'draft' | 'review' | 'published' | 'retired';
const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'All',
  draft: 'Draft',
  review: 'To check',
  published: 'Live',
  retired: 'Retired',
};

function matches(q: QuizListItem, status: StatusFilter): boolean {
  if (status === 'all') return true;
  if (status === 'review') return q.in_review;
  return q.status === status;
}

/** Every quiz with filters; rows open the editor. */
export function LibraryScreen(): JSX.Element {
  const { client, subjects } = useStudio();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const status = (params.get('status') as StatusFilter | null) ?? 'all';
  const subject = params.get('subject') ?? '';
  const ks = (params.get('ks') as KeyStage | null) ?? '';
  const [text, setText] = useState(params.get('q') ?? '');
  const { data, error, loading, reload } = useLoad(() => client.quizzes(), []);

  const set = (key: string, value: string): void => {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const base = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (data ?? []).filter(
      (q) =>
        (!subject || q.category?.slug === subject) &&
        (!ks || q.ks === ks) &&
        (!t || q.title.toLowerCase().includes(t) || q.slug.includes(t)),
    );
  }, [data, subject, ks, text]);
  const list = base.filter((q) => matches(q, status));
  const totalQuestions = (data ?? []).reduce((s, q) => s + q.question_count, 0);

  return (
    <>
      <AHead
        title="Library"
        lead={
          data
            ? `${plural(data.length, 'quiz', 'quizzes')} · ${plural(totalQuestions, 'question', 'questions')}. Live quizzes are versioned, never deleted.`
            : 'Every quiz, live or not.'
        }
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            New quiz
          </Button>
        }
      />
      {creating && <NewQuizDialog onClose={() => setCreating(false)} />}
      <Filters>
        <label htmlFor="lib-q" className="sr-only">
          Search titles
        </label>
        <input
          id="lib-q"
          className={`${inputClass} h-9 max-w-[280px] flex-[1_1_180px] py-0`}
          placeholder="Search titles"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label htmlFor="lib-subject" className="sr-only">
          Subject
        </label>
        <select
          id="lib-subject"
          className={`${selectClass} h-9 w-auto max-w-[200px] flex-[0_1_170px]`}
          value={subject}
          onChange={(e) => set('subject', e.target.value)}
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
              {s.kind === 'school' ? ' (school)' : ''}
            </option>
          ))}
        </select>
        <label htmlFor="lib-ks" className="sr-only">
          Key stage
        </label>
        <select
          id="lib-ks"
          className={`${selectClass} h-9 w-auto flex-[0_1_130px]`}
          value={ks}
          onChange={(e) => set('ks', e.target.value)}
        >
          <option value="">Any level</option>
          {KEY_STAGES.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <SegList<StatusFilter>
          label="Status"
          value={status}
          onChange={(v) => set('status', v)}
          options={(['all', 'draft', 'review', 'published', 'retired'] as const).map((s) => ({
            value: s,
            label: STATUS_LABEL[s],
            count: base.filter((q) => matches(q, s)).length,
          }))}
        />
      </Filters>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <Table
          label="Quizzes"
          head={[
            { label: 'Quiz' },
            { label: 'Subject' },
            { label: 'Level' },
            { label: 'Status' },
            { label: 'Version', num: true },
            { label: 'Questions', num: true },
            { label: 'Plays', num: true },
            { label: 'Right', num: true },
            { label: 'Updated' },
          ]}
        >
          {list.map((q) => (
            <Tr
              key={q.id}
              className="cursor-pointer"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) return;
                navigate(`/admin/edit/${q.id}`);
              }}
            >
              <Td label="Quiz" lead>
                <Link
                  to={`/admin/edit/${q.id}`}
                  className="block max-w-[260px] truncate font-extrabold text-content hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 max-[719px]:max-w-none max-[719px]:whitespace-normal"
                >
                  {q.title}
                </Link>
              </Td>
              <Td label="Subject">{q.category?.name ?? '–'}</Td>
              <Td label="Level">{q.ks ?? <span className="text-content-muted">All</span>}</Td>
              <Td label="Status">
                <span className="inline-flex flex-wrap justify-end gap-1 min-[720px]:justify-start">
                  {quizState(q).map((p) => (
                    <Pill key={p.label} tone={p.tone}>
                      {p.label}
                    </Pill>
                  ))}
                </span>
              </Td>
              <Td label="Version" num>
                {q.version ? `v${q.version}` : '–'}
              </Td>
              <Td label="Questions" num>
                {q.question_count}
              </Td>
              <Td label="Plays" num>
                {q.plays.toLocaleString('en-GB')}
              </Td>
              <Td label="Right" num>
                {q.right_rate === null ? '–' : `${q.right_rate}%`}
              </Td>
              <Td label="Updated" className="whitespace-nowrap text-content-muted">
                {niceDate(q.updated_at)}
              </Td>
            </Tr>
          ))}
          {list.length === 0 && (
            <tr className="max-[719px]:block">
              <td colSpan={9} className="max-[719px]:block">
                <Empty>No quizzes match these filters.</Empty>
              </td>
            </tr>
          )}
        </Table>
      )}
    </>
  );
}
