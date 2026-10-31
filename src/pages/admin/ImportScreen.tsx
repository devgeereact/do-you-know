import { useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { londonToday } from '@/lib/adminValidation';
import {
  IMPORT_CHEATSHEET,
  IMPORT_SAMPLE,
  MAX_IMPORT_BYTES,
  groupsOf,
  parseImport,
  rowToContent,
  type ImportGroup,
  type ImportRow,
} from '@/lib/importParser';
import { cn } from '@/lib/utils';
import { AdminApiError, adminErrorMessage } from '@/services/adminService';
import {
  cardClass,
  inputClass,
  linkButtonClass,
  plural,
  selectClass,
  useLoad,
  useStudio,
} from '@/pages/admin/studio';
import { AHead, Panel, Pill, Table, Td, Tr } from '@/pages/admin/ui';

interface Outcome {
  key: string;
  ok: boolean;
  text: string;
  quizId?: string;
  errors?: { line: number; message: string }[];
}

/** Paste or drop questions; they become drafts, never live quizzes. */
export function ImportScreen(): JSX.Element {
  const { client, subjects, refreshSubjects, refreshCounts, toast, confirm } = useStudio();
  const today = londonToday();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const quizzes = useLoad(() => client.quizzes(), []);

  const rows: ImportRow[] = useMemo(() => {
    if (parsed === null) return [];
    const base = parseImport(parsed, subjects, today);
    return base.map((r, i) => {
      const pick = overrides[i];
      return pick && !r.newSubject ? { ...r, subject: pick, guessed: false } : r;
    });
  }, [parsed, subjects, today, overrides]);
  const ready = rows.filter((r) => !r.block.length);
  const groups = groupsOf(rows);
  const newSubjects = [...new Set(rows.filter((r) => r.newSubject).map((r) => r.newSubject))];
  const subjectName = (slug: string): string =>
    slug.startsWith('new:') ? slug.slice(4) : (subjects.find((s) => s.slug === slug)?.name ?? slug);
  const targetOf = (g: ImportGroup): string => targets[g.key] ?? 'new';
  const creatable = (g: ImportGroup): boolean =>
    !g.sid.startsWith('new:') && !(targetOf(g) === 'new' && g.rows.length < 3);

  const check = (value = text): void => {
    setOverrides({});
    setTargets({});
    setOutcomes([]);
    setParsed(value);
  };

  const readFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    if (!/\.(txt|csv|md)$/i.test(file.name)) {
      toast('Use a .txt, .csv or .md file.', 'bad');
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      toast('That file is over 256 KB. Split it into smaller files.', 'bad');
      return;
    }
    const value = await file.text();
    setText(value);
    check(value);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setOver(false);
    void readFile(e.dataTransfer.files[0]);
  };

  const makeSubject = async (name: string): Promise<void> => {
    const kind = rows.some((r) => r.newSubject === name && r.ks) ? 'school' : 'general';
    const ok = await confirm({
      title: `Create “${name}”?`,
      body: `A new ${kind === 'school' ? 'school' : 'topic'} subject. It shows on the site once it has a live quiz.`,
      confirmLabel: 'Create subject',
    });
    if (!ok) return;
    try {
      await client.createSubject({ name, kind });
      await refreshSubjects();
      toast(`Subject “${name}” created`);
    } catch (err) {
      toast(adminErrorMessage(err), 'bad');
    }
  };

  const create = async (): Promise<void> => {
    const todo = groups.filter(creatable);
    const ok = await confirm({
      title: `Create drafts from ${plural(
        todo.reduce((s, g) => s + g.rows.length, 0),
        'question',
        'questions',
      )}?`,
      body: 'They become drafts. Nothing goes live until each question is checked and published.',
      confirmLabel: 'Create drafts',
    });
    if (!ok) return;
    setBusy(true);
    const results: Outcome[] = [];
    for (const g of todo) {
      const questions = g.rows.map(rowToContent);
      const target = targetOf(g);
      try {
        if (target === 'new') {
          const made = await client.createQuiz({
            title: g.topic || subjectName(g.sid),
            category: g.sid,
            ks: g.ks || null,
            questions,
          });
          results.push({
            key: g.key,
            ok: true,
            text: `New draft “${g.topic || subjectName(g.sid)}” with ${plural(questions.length, 'question', 'questions')}`,
            quizId: made.id,
          });
        } else {
          await client.append(target, questions);
          const title = quizzes.data?.find((q) => q.id === target)?.title ?? 'the quiz';
          results.push({
            key: g.key,
            ok: true,
            text: `Added ${plural(questions.length, 'question', 'questions')} to “${title}”`,
            quizId: target,
          });
        }
      } catch (err) {
        const errors =
          err instanceof AdminApiError
            ? err.problems.map((p) => ({
                line: typeof p.index === 'number' ? (g.rows[p.index]?.line ?? 0) : 0,
                message: p.message,
              }))
            : [];
        results.push({
          key: g.key,
          ok: false,
          text: `${g.topic || subjectName(g.sid)}: ${adminErrorMessage(err)}`,
          errors,
        });
      }
    }
    setOutcomes(results);
    setBusy(false);
    refreshCounts();
    quizzes.reload();
    const made = results.filter((r) => r.ok).length;
    if (made) toast(`Created ${plural(made, 'draft', 'drafts')}`);
  };

  return (
    <>
      <AHead
        title="Import questions"
        lead="Paste from Notepad, Word or a spreadsheet, or drop a .txt, .csv or .md file. Imports become drafts. Nothing goes live from here."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel className="grid min-w-0 content-start gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={cn(
              'rounded-[14px] border-2 border-dashed p-3 text-center text-sm text-content-muted',
              over ? 'border-primary bg-primary/10' : 'border-surface-border',
            )}
          >
            <b className="text-content">Drop a file</b> or{' '}
            <label className="cursor-pointer font-bold text-primary hover:underline">
              choose one
              <input
                type="file"
                accept=".txt,.csv,.md,text/plain,text/csv,text/markdown"
                className="sr-only"
                onChange={(e) => {
                  void readFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>{' '}
            · up to 256 KB
          </div>
          <label htmlFor="imp-text" className="sr-only">
            Questions
          </label>
          <textarea
            id="imp-text"
            rows={12}
            className={`${inputClass} font-mono text-[13px] leading-normal`}
            placeholder="Paste your questions here"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!text.trim()} onClick={() => check()}>
              Check questions
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setText(IMPORT_SAMPLE);
                check(IMPORT_SAMPLE);
              }}
            >
              Use the example
            </Button>
            {parsed !== null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setText('');
                  setParsed(null);
                  setOutcomes([]);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </Panel>
        <details open className={cn(cardClass, 'min-w-0 p-4 lg:p-5')}>
          <summary className="cursor-pointer font-bold">How to write them</summary>
          <pre className="my-2.5 whitespace-pre-wrap rounded-[10px] bg-content/[0.05] px-3 py-2.5 font-mono text-[13px] [overflow-wrap:anywhere]">
            {IMPORT_CHEATSHEET}
          </pre>
          <ul className="grid list-disc gap-1 pl-5 text-sm">
            <li>
              <b>*</b> marks the right answer, or write <b>Answer: b</b>. 2 to 6 answers
            </li>
            <li>A blank line between questions</li>
            <li>
              <b>#</b> sets subject, key stage and topic for what follows
            </li>
            <li>No heading? We guess the subject and you can change it</li>
            <li>Source and explanation can be added later, but are needed to publish</li>
            <li>CSV columns: subject, ks, topic, question, a–f, answer, explanation, source</li>
          </ul>
        </details>
      </div>

      {newSubjects.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-3">
          <b className="text-sm">
            New subject{newSubjects.length > 1 ? 's' : ''} in this file: {newSubjects.join(', ')}
          </b>
          {newSubjects.map((n) =>
            n ? (
              <Button key={n} size="sm" className="h-9" onClick={() => void makeSubject(n)}>
                Create “{n}”
              </Button>
            ) : null,
          )}
          <span className="text-xs text-content-muted">
            Hidden on the site until it has a live quiz.
          </span>
        </div>
      )}

      {parsed !== null && rows.length === 0 && (
        <p className="mt-4 font-semibold text-content-muted">No questions found in that text.</p>
      )}

      {rows.length > 0 && (
        <>
          <div className="mb-2 mt-4 flex flex-wrap gap-2">
            <Pill tone="ok">{ready.length} ready</Pill>
            <Pill tone="bad">{rows.length - ready.length} need fixing in the text</Pill>
            <Pill tone="warn">
              {ready.filter((r) => r.later.length).length} need a source or explanation later
            </Pill>
          </div>
          <Table
            label="Questions found"
            head={[
              { label: 'Line' },
              { label: 'Question' },
              { label: 'Answers' },
              { label: 'Subject' },
              { label: 'Check' },
            ]}
          >
            {rows.map((r, i) => (
              <Tr key={`${r.line}-${i}`} className={r.block.length ? 'bg-wrong/[0.04]' : undefined}>
                <Td label="Line" className="text-content-muted">
                  {r.line}
                </Td>
                <Td label="Question" lead>
                  <b className="block [overflow-wrap:anywhere]">{r.q.prompt || '(no question)'}</b>
                  {r.q.explanation && (
                    <span className="text-xs text-content-muted">{r.q.explanation}</span>
                  )}
                </Td>
                <Td label="Answers">
                  <span className="inline-flex flex-wrap justify-end gap-1 min-[720px]:justify-start">
                    {r.q.type === 'slider' && r.q.slider ? (
                      <span>
                        Slider {r.q.slider.min}–{r.q.slider.max}: <b>{r.q.slider.correct}</b>
                      </span>
                    ) : r.q.type === 'boolean' ? (
                      [true, false].map((v) => (
                        <Opt key={String(v)} ok={r.q.answer === v}>
                          {v ? 'True' : 'False'}
                        </Opt>
                      ))
                    ) : (
                      (r.q.options ?? []).map((o, k) => (
                        <Opt key={k} ok={o.correct}>
                          {o.label}
                        </Opt>
                      ))
                    )}
                  </span>
                </Td>
                <Td label="Subject">
                  <span className="grid justify-items-end gap-0.5 min-[720px]:justify-items-start">
                    {r.newSubject ? (
                      <Pill tone="grape">New: {r.newSubject}</Pill>
                    ) : (
                      <select
                        aria-label={`Subject for line ${r.line}`}
                        className={`${selectClass} h-8 w-[180px] max-w-full text-[13px]`}
                        value={r.subject}
                        onChange={(e) => setOverrides((o) => ({ ...o, [i]: e.target.value }))}
                      >
                        {subjects.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {s.name}
                            {s.kind === 'school' ? ' (school)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {r.guessed && (
                      <span className="text-xs font-extrabold text-[#9A6400]">guessed</span>
                    )}
                    {r.ks && (
                      <span className="text-xs text-content-muted">
                        {r.ks}
                        {r.topic ? ` · ${r.topic}` : ''}
                      </span>
                    )}
                  </span>
                </Td>
                <Td label="Check">
                  <span className="grid justify-items-end gap-0.5 min-[720px]:justify-items-start">
                    {r.block.map((e) => (
                      <span key={e} className="text-[12.5px] font-extrabold text-wrong">
                        ✕ {e}
                      </span>
                    ))}
                    {r.later.map((e) => (
                      <span key={e} className="text-[12.5px] font-extrabold text-[#9A6400]">
                        ! {e}
                      </span>
                    ))}
                    {!r.block.length && !r.later.length && <Pill tone="ok">Ready</Pill>}
                  </span>
                </Td>
              </Tr>
            ))}
          </Table>

          <h2 className="mb-2 mt-6 font-display text-xl font-extrabold">Where they’ll go</h2>
          <div className="grid gap-2">
            {groups.map((g) => {
              const isNew = g.sid.startsWith('new:');
              const target = targetOf(g);
              const small = g.rows.length < 3 && target === 'new';
              const same = (quizzes.data ?? []).filter(
                (q) => q.category?.slug === g.sid && q.status !== 'retired',
              );
              return (
                <div
                  key={g.key}
                  className={cn(cardClass, 'flex flex-wrap items-center justify-between gap-3 p-4')}
                >
                  <div className="min-w-0">
                    <b>{g.topic || subjectName(g.sid)}</b>{' '}
                    <span className="text-sm text-content-muted">
                      {subjectName(g.sid)}
                      {g.ks ? ` · ${g.ks}` : ''} · {plural(g.rows.length, 'question', 'questions')}
                    </span>
                    {isNew && (
                      <p className="text-[12.5px] font-extrabold text-[#9A6400]">
                        Create the subject first.
                      </p>
                    )}
                    {!isNew && small && (
                      <p className="text-[12.5px] font-extrabold text-[#9A6400]">
                        A new quiz needs at least 3 questions. Add these to an existing quiz
                        instead, or add more.
                      </p>
                    )}
                  </div>
                  <select
                    aria-label={`Where “${g.topic || subjectName(g.sid)}” goes`}
                    className={`${selectClass} h-9 w-[320px] max-w-full`}
                    disabled={isNew}
                    value={target}
                    onChange={(e) => setTargets((t) => ({ ...t, [g.key]: e.target.value }))}
                  >
                    <option value="new">New draft quiz</option>
                    {same.map((q) => (
                      <option key={q.id} value={q.id}>
                        Add to “{q.title}”
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {groups.length === 0 && <p className="text-content-muted">Nothing ready yet.</p>}
          </div>
          <div className="mt-3 flex justify-end">
            <Button disabled={busy || !groups.some(creatable)} onClick={() => void create()}>
              {busy ? 'Creating…' : 'Create drafts'}
            </Button>
          </div>
          {outcomes.length > 0 && (
            <Panel className="mt-4 grid gap-2">
              <h2 className="font-display text-lg font-extrabold">Results</h2>
              {outcomes.map((o) => (
                <div key={o.key} className="text-sm">
                  <span className={o.ok ? 'font-bold text-correct' : 'font-bold text-wrong'}>
                    {o.ok ? '✓' : '✕'} {o.text}
                  </span>{' '}
                  {o.quizId && (
                    <Link to={`/admin/edit/${o.quizId}`} className={linkButtonClass}>
                      Open
                    </Link>
                  )}
                  {o.errors?.map((e, i) => (
                    <p key={i} className="text-[12.5px] font-bold text-wrong">
                      {e.line ? `Line ${e.line}: ` : ''}
                      {e.message}
                    </p>
                  ))}
                </div>
              ))}
            </Panel>
          )}
        </>
      )}
    </>
  );
}

function Opt({ ok, children }: { ok: boolean; children: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-[12.5px] font-bold',
        ok
          ? 'bg-correct/10 text-correct ring-[1.5px] ring-inset ring-correct'
          : 'bg-content/[0.06]',
      )}
    >
      {children}
    </span>
  );
}
