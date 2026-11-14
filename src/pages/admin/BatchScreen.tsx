import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { londonToday } from '@/lib/adminValidation';
import { PACES, dayLabel, paceFinish } from '@/lib/batchPace';
import { LEVELS } from '@/lib/levels';
import {
  adminErrorMessage,
  type BatchQuiz,
  type BatchSampleItem,
  type BatchState,
} from '@/services/adminService';
import type { Tone } from '@/pages/admin/studio';
import { niceDateTime, plural, selectClass, useLoad, useStudio } from '@/pages/admin/studio';
import {
  AHead,
  Empty,
  ErrorNote,
  Loading,
  Modal,
  Panel,
  Pill,
  Table,
  Td,
  Tr,
} from '@/pages/admin/ui';

const LEVEL_AGES: Record<string, [number, number]> = {
  starters: [4, 5],
  explorers: [6, 8],
  adventurers: [9, 11],
  challengers: [12, 14],
  scholars: [15, 16],
};
const LEVEL_NAME: Record<string, string> = {
  ...Object.fromEntries(LEVELS.map((l) => [l.id, l.name])),
  adult: 'Adult',
};
const STATE: Record<BatchState, { label: string; tone: Tone }> = {
  ready: { label: 'Ready', tone: 'ok' },
  look: { label: 'Needs a look', tone: 'warn' },
  scheduled: { label: 'Scheduled', tone: 'lemon' },
  live: { label: 'Live', tone: 'grape' },
  retired: { label: 'Retired', tone: 'mute' },
};

/** The batches list, or one batch: sorted into ready and needs a look, edited in bulk, published at a pace. */
export function BatchScreen(): JSX.Element {
  const { id } = useParams();
  return id ? <OneBatch id={id} /> : <BatchList />;
}

function BatchList(): JSX.Element {
  const { client } = useStudio();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(() => client.batches(), [client]);
  return (
    <>
      <AHead
        title="Batches"
        lead="Each time you add questions, the quizzes it makes are kept together here, so you can fix what needs a look and publish the rest at one pace."
        actions={
          <Link to="/admin/import">
            <Button size="sm">Add questions</Button>
          </Link>
        }
      />
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <Table
          label="Batches"
          head={[
            { label: 'Added' },
            { label: 'Quizzes', num: true },
            { label: 'Drafts', num: true },
            { label: 'Published', num: true },
          ]}
        >
          {(data ?? []).map((b) => (
            <Tr
              key={b.id}
              className="cursor-pointer"
              onClick={() => navigate(`/admin/batch/${b.id}`)}
            >
              <Td label="Added" lead>
                <Link
                  to={`/admin/batch/${b.id}`}
                  className="font-extrabold text-content hover:text-primary"
                >
                  {niceDateTime(b.started_at)}
                </Link>
              </Td>
              <Td label="Quizzes" num>
                {b.quizzes}
              </Td>
              <Td label="Drafts" num>
                {b.drafts}
              </Td>
              <Td label="Published" num>
                {b.published}
              </Td>
            </Tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr className="max-[719px]:block">
              <td colSpan={4} className="max-[719px]:block">
                <Empty>
                  No batches yet. Add questions and the quizzes it makes will appear here.
                </Empty>
              </td>
            </tr>
          )}
        </Table>
      )}
    </>
  );
}

function OneBatch({ id }: { id: string }): JSX.Element {
  const { client, toast, confirm, refreshCounts } = useStudio();
  const today = londonToday();
  const { data, error, loading, reload } = useLoad(() => client.batch(id), [client, id]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [perDay, setPerDay] = useState(5);
  const [busy, setBusy] = useState(false);
  const [difficulty, setDifficulty] = useState('');
  const [level, setLevel] = useState('');
  const [ranked, setRanked] = useState('');
  // The five questions to read before publishing, and which are ticked as read.
  const [reading, setReading] = useState<BatchSampleItem[] | null>(null);
  const [read, setRead] = useState<Set<number>>(new Set());

  const counts = data?.counts;
  const finish = useMemo(
    () => paceFinish(counts?.ready ?? 0, perDay, today),
    [counts?.ready, perDay, today],
  );
  const allPicked = !!data && data.quizzes.length > 0 && picked.size === data.quizzes.length;

  const toggle = (qid: string): void =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(qid)) n.delete(qid);
      else n.add(qid);
      return n;
    });

  const applyBulk = async (): Promise<void> => {
    if (!data) return;
    const targets = data.quizzes.filter((q) => picked.has(q.id) && q.status !== 'retired');
    const meta: Record<string, unknown> = {};
    if (difficulty) meta.difficulty = difficulty;
    if (ranked) meta.is_ranked = ranked === 'on';
    const ages = LEVEL_AGES[level];
    if (ages) {
      meta.age_min = ages[0];
      meta.age_max = ages[1];
    }
    if (!targets.length || Object.keys(meta).length === 0) return;
    setBusy(true);
    try {
      for (const q of targets) await client.saveQuiz(q.id, { meta });
      toast(`Updated ${plural(targets.length, 'quiz', 'quizzes')}. They were checked again.`);
      setPicked(new Set());
      setDifficulty('');
      setLevel('');
      setRanked('');
      reload();
    } catch (err) {
      toast(adminErrorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  };

  // Step one: pick up to five questions from the ready quizzes and ask for them to be read.
  const startPublish = async (): Promise<void> => {
    if (!counts || counts.ready === 0) return;
    setBusy(true);
    try {
      const { items } = await client.batchSample(id);
      setRead(new Set());
      setReading(items);
    } catch (err) {
      toast(adminErrorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  };

  // Step two: once every one is ticked as read, publish at the chosen pace.
  const publish = async (): Promise<void> => {
    setReading(null);
    setBusy(true);
    try {
      const r = await client.publishBatch(id, { per_day: perDay });
      toast(
        r.published
          ? `Published ${plural(r.published, 'quiz', 'quizzes')}${r.last && r.last !== r.first ? `, the last on ${dayLabel(r.last)}` : ''}.`
          : 'Nothing was ready to publish.',
      );
      reload();
      refreshCounts();
    } catch (err) {
      toast(adminErrorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  };

  const undo = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Undo what has not gone live yet?',
      body: 'Quizzes scheduled for a later day are taken back. Quizzes already live are left alone. Nothing is deleted.',
      confirmLabel: 'Undo',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await client.undoBatch(id);
      toast(`Took back ${plural(r.undone, 'quiz', 'quizzes')}.`);
      reload();
      refreshCounts();
    } catch (err) {
      toast(adminErrorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  };

  const row = (q: BatchQuiz): JSX.Element => (
    <Tr key={q.id}>
      <Td label="Pick" className="w-10">
        <input
          type="checkbox"
          aria-label={`Select ${q.title}`}
          className="h-[18px] w-[18px] accent-primary"
          checked={picked.has(q.id)}
          onChange={() => toggle(q.id)}
        />
      </Td>
      <Td label="Quiz" lead>
        <Link
          to={`/admin/edit/${q.id}`}
          className="block max-w-[300px] font-extrabold text-content hover:text-primary max-[719px]:max-w-none"
        >
          {q.title}
        </Link>
        {q.state === 'look' && q.reasons.length > 0 && (
          <span className="mt-0.5 block max-w-[320px] text-xs text-content-muted max-[719px]:max-w-none">
            {q.reasons[0]}
            {q.reasons.length > 1 ? ` (and ${q.reasons.length - 1} more)` : ''}
          </span>
        )}
      </Td>
      <Td label="Subject">{q.category.name ?? '–'}</Td>
      <Td label="Level">
        {q.level ? (
          (LEVEL_NAME[q.level] ?? q.level)
        ) : (
          <span className="text-content-muted">All ages</span>
        )}
      </Td>
      <Td label="Difficulty" className="capitalize">
        {q.difficulty}
      </Td>
      <Td label="Ranked">{q.is_ranked ? 'On' : 'Practice only'}</Td>
      <Td label="Questions" num>
        {q.questions}
      </Td>
      <Td label="State">
        <Pill tone={STATE[q.state].tone}>{STATE[q.state].label}</Pill>
      </Td>
    </Tr>
  );

  return (
    <>
      <AHead
        title="Batch"
        lead="Fix what needs a look, set difficulty and level for several at once, then publish the ready ones at a pace you choose. Nothing goes live until you press Publish."
        actions={
          <Link to="/admin/batch">
            <Button size="sm" variant="ghost">
              All batches
            </Button>
          </Link>
        }
      />
      {loading && !data ? (
        <Loading />
      ) : error || !data ? (
        <ErrorNote message={error ?? 'Could not load.'} onRetry={reload} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Pill tone="mute">{plural(data.counts.total, 'quiz', 'quizzes')}</Pill>
            <Pill tone="mute">{plural(data.counts.questions, 'question', 'questions')}</Pill>
            <Pill tone="ok">{data.counts.ready} ready</Pill>
            <Pill tone="warn">{data.counts.look} need a look</Pill>
            {data.counts.scheduled > 0 && (
              <Pill tone="lemon">{data.counts.scheduled} scheduled</Pill>
            )}
            {data.counts.live > 0 && <Pill tone="grape">{data.counts.live} live</Pill>}
          </div>

          {picked.size > 0 && (
            <Panel
              className="mb-3 flex flex-wrap items-center gap-3"
              role="group"
              aria-label="Change several at once"
            >
              <b className="text-sm">{picked.size} selected</b>
              <label className="flex items-center gap-1.5 text-sm">
                Difficulty
                <select
                  className={`${selectClass} h-9 w-auto`}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="">Keep</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                Level
                <select
                  className={`${selectClass} h-9 w-auto`}
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="">Keep</option>
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                Ranked
                <select
                  className={`${selectClass} h-9 w-auto`}
                  value={ranked}
                  onChange={(e) => setRanked(e.target.value)}
                >
                  <option value="">Keep</option>
                  <option value="on">On</option>
                  <option value="off">Practice only</option>
                </select>
              </label>
              <Button
                size="sm"
                disabled={busy || (!difficulty && !level && !ranked)}
                onClick={() => void applyBulk()}
              >
                Apply
              </Button>
            </Panel>
          )}

          <Table
            label="Quizzes in this batch"
            head={[
              { label: '' },
              { label: 'Quiz' },
              { label: 'Subject' },
              { label: 'Level' },
              { label: 'Difficulty' },
              { label: 'Ranked' },
              { label: 'Questions', num: true },
              { label: 'State' },
            ]}
          >
            <tr className="max-[719px]:block">
              <td colSpan={8} className="px-3 py-2 max-[719px]:block">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-[18px] w-[18px] accent-primary"
                    checked={allPicked}
                    onChange={() =>
                      setPicked(allPicked ? new Set() : new Set(data.quizzes.map((q) => q.id)))
                    }
                  />
                  Select all
                </label>
              </td>
            </tr>
            {data.quizzes.map(row)}
          </Table>

          {data.counts.scheduled > 0 && (
            <Panel className="mt-3 grid gap-2">
              <b>Going live</b>
              <p className="text-sm text-content-muted">
                {plural(data.counts.live, 'quiz is', 'quizzes are')} live and{' '}
                {plural(data.counts.scheduled, 'is', 'are')} scheduled for the days ahead.
              </p>
              <div>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void undo()}>
                  Undo what is not live yet
                </Button>
              </div>
            </Panel>
          )}

          <Panel className="mt-3 flex flex-wrap items-center gap-3">
            <Button disabled={busy || data.counts.ready === 0} onClick={() => void startPublish()}>
              {perDay === 0
                ? `Publish ${data.counts.ready} ready now`
                : `Publish ${data.counts.ready} ready, ${perDay} a day`}
            </Button>
            <label className="flex items-center gap-1.5 text-sm" htmlFor="batch-pace">
              Pace
            </label>
            <select
              id="batch-pace"
              className={`${selectClass} h-10 w-auto`}
              value={perDay}
              onChange={(e) => setPerDay(Number(e.target.value))}
            >
              {PACES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-content-muted">
              {data.counts.ready === 0
                ? 'Nothing is ready yet.'
                : perDay === 0
                  ? 'Everything goes live today.'
                  : `The last one goes live ${dayLabel(finish.last)} (${plural(finish.days, 'day', 'days')}).`}
            </span>
          </Panel>

          {reading && (
            <Modal
              wide
              title={`Read ${reading.length === 1 ? 'this question' : `these ${reading.length} questions`} first`}
              onClose={() => setReading(null)}
              footer={
                <>
                  <Button variant="ghost" size="sm" onClick={() => setReading(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={read.size < reading.length}
                    onClick={() => void publish()}
                  >
                    Publish
                  </Button>
                </>
              }
            >
              <p className="mb-3 text-[15px] text-content-muted">
                {perDay === 0
                  ? `All ${plural(data.counts.ready, 'quiz', 'quizzes')} go live now.`
                  : `${perDay} go live each day, the last on ${dayLabel(finish.last)}.`}{' '}
                Here is a spread from across the batch. Tick each one once you have read it.
                {data.counts.look > 0 && ` ${data.counts.look} that need a look stay as drafts.`}
              </p>
              <ul className="grid gap-3">
                {reading.map((it, i) => (
                  <li key={`${it.quiz_id}-${it.number}`} className="rounded-2xl bg-content/4 p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-[18px] w-[18px] shrink-0 accent-primary"
                        checked={read.has(i)}
                        onChange={() =>
                          setRead((r) => {
                            const n = new Set(r);
                            if (n.has(i)) n.delete(i);
                            else n.add(i);
                            return n;
                          })
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-xs text-content-muted">
                          {it.title}, question {it.number}
                        </span>
                        <b className="block text-[15px] wrap-anywhere">{it.prompt}</b>
                        <span className="block text-sm">
                          Right answer: <b>{it.answer}</b>
                        </span>
                        <span className="block text-sm text-content-muted">{it.explanation}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Modal>
          )}
        </>
      )}
    </>
  );
}
