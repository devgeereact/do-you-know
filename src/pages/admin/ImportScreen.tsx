import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { londonToday, markedAnswer } from '@/lib/adminValidation';
import {
  applyFix,
  planBatches,
  runBatches,
  type ReviewBatch,
  type ReviewItem,
} from '@/lib/aiReview';
import { combineImportFiles, MAX_IMPORT_FILES } from '@/lib/importFiles';
import {
  IMPORT_CHEATSHEET,
  agesLabel,
  groupTitle,
  importIntro,
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
import { AiVerdict, type FixState } from '@/pages/admin/AiReview';

/** Questions the AI can review: multiple choice and not blocked by the format checks. */
const reviewable = (list: ImportRow[]): ImportRow[] =>
  list.filter((r) => !r.block.length && r.q.type === 'choice');

type RowBatch = ReviewBatch<ImportRow> & { group: ImportGroup };

function rowBatches(list: ImportRow[], only?: Set<number>): RowBatch[] {
  const groups = groupsOf(list);
  return planBatches(
    groups.map((g) => ({
      key: g.key,
      items: reviewable(g.rows).filter((r) => !only || only.has(r.line)),
    })),
  ).map((b) => ({ ...b, group: groups.find((g) => g.key === b.key)! }));
}

interface Outcome {
  key: string;
  ok: boolean;
  text: string;
  quizId?: string;
  /** The same questions were already imported, so nothing new was made. */
  duplicate?: boolean;
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
  // The batch the last Add made, so the results can lead straight to it.
  const [lastBatch, setLastBatch] = useState<string | null>(null);
  const quizzes = useLoad(() => client.quizzes(), []);
  const gen = useLoad(() => client.generator(), [client]);
  const reviewReady = gen.data?.review_ready === true;
  // AI review (ADR-021), keyed by the question's line in the pasted text.
  const [review, setReview] = useState<Record<number, ReviewItem>>({});
  const [fixState, setFixState] = useState<Record<number, FixState>>({});
  const [reviewing, setReviewing] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<{ lines: number[]; message: string } | null>(null);
  const runId = useRef(0);

  const rows: ImportRow[] = useMemo(() => {
    if (parsed === null) return [];
    const base = parseImport(parsed, subjects, today);
    return base.map((r, i) => {
      const pick = overrides[i];
      return pick && !r.newSubject ? { ...r, subject: pick, guessed: false } : r;
    });
  }, [parsed, subjects, today, overrides]);
  // Accepted AI fixes replace the question before anything is created.
  const finalRows: ImportRow[] = rows.map((r) => {
    const fix = review[r.line]?.fix;
    return fix && fixState[r.line] === 'accepted' ? { ...r, q: applyFix(r.q, fix) } : r;
  });
  const ready = finalRows.filter((r) => !r.block.length);
  const groups = groupsOf(finalRows);
  const fixLines = rows.filter((r) => review[r.line]?.verdict === 'fix').map((r) => r.line);
  const pendingFixes = fixLines.filter((l) => (fixState[l] ?? 'pending') === 'pending');
  const acceptedIn = (list: ImportRow[]): number =>
    list.filter((r) => review[r.line]?.fix && fixState[r.line] === 'accepted').length;
  const reviewCalls = rowBatches(rows).length;
  const reviewedCount = Object.keys(review).length;
  const verdicts = Object.values(review);
  const setFix = (lines: number[], state: FixState): void =>
    setFixState((f) => ({ ...f, ...Object.fromEntries(lines.map((l) => [l, state])) }));
  const newSubjects = [...new Set(rows.filter((r) => r.newSubject).map((r) => r.newSubject))];
  const subjectName = (slug: string): string => subjectNameOf(slug);
  function subjectNameOf(slug: string): string {
    return slug.startsWith('new:')
      ? slug.slice(4)
      : (subjects.find((s) => s.slug === slug)?.name ?? slug);
  }
  const targetOf = (g: ImportGroup): string => targets[g.key] ?? 'new';
  const creatable = (g: ImportGroup): boolean =>
    !g.sid.startsWith('new:') && !(targetOf(g) === 'new' && g.rows.length < 3);

  const runReview = async (list: ImportRow[], only?: Set<number>): Promise<void> => {
    const batches = rowBatches(list, only);
    if (!batches.length) return;
    const id = runId.current;
    let done = 0;
    setFailed(null);
    setReviewing({ done, total: batches.length });
    const outcomes = await runBatches(batches, async (b) => {
      try {
        const res = await client.reviewImport({
          questions: b.items.map(rowToContent),
          subject: subjectNameOf(b.group.sid),
          topic: b.group.topic || undefined,
          age_min: b.group.ages?.min ?? null,
          age_max: b.group.ages?.max ?? null,
        });
        if (id !== runId.current) return;
        setReview((prev) => {
          const next = { ...prev };
          for (const it of res.items) {
            const row = b.items[it.index];
            if (row) next[row.line] = it;
          }
          return next;
        });
      } catch (err) {
        throw new Error(adminErrorMessage(err));
      } finally {
        done += 1;
        if (id === runId.current) setReviewing({ done, total: batches.length });
      }
    });
    if (id !== runId.current) return;
    setReviewing(null);
    const lines = outcomes.flatMap((o, i) =>
      o.ok ? [] : (batches[i]?.items ?? []).map((r) => r.line),
    );
    const first = outcomes.find((o) => !o.ok);
    if (lines.length && first && !first.ok) setFailed({ lines, message: first.error });
  };

  const check = (value = text): void => {
    setOverrides({});
    setTargets({});
    setOutcomes([]);
    setParsed(value);
    runId.current += 1;
    setReview({});
    setFixState({});
    setFailed(null);
    setReviewing(null);
  };

  // The text is read as it is typed or dropped. The AI review never starts by itself: it costs credits,
  // so it is its own button below.
  useEffect(() => {
    if (!text.trim() || text === parsed) return;
    const t = window.setTimeout(() => check(text), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- check() only sets state from the text
  }, [text]);

  const readFiles = async (list: File[]): Promise<void> => {
    if (list.length === 0) return;
    const big = list.find((f) => f.size > MAX_IMPORT_BYTES);
    if (big) {
      toast(`“${big.name}” is over 256 KB. Split it into smaller files.`, 'bad');
      return;
    }
    const picked = await Promise.all(
      list.map(async (f) => ({ name: f.name, text: await f.text() })),
    );
    const joined = combineImportFiles(picked);
    if (!joined.ok) {
      toast(joined.message, 'bad');
      return;
    }
    setText(joined.text);
    check(joined.text);
    if (joined.count > 1) toast(`Read ${joined.count} files`);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setOver(false);
    void readFiles(Array.from(e.dataTransfer.files));
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
      body: 'They become drafts with every question already checked, because you are importing them. Nothing goes live until you publish.',
      confirmLabel: 'Create drafts',
    });
    if (!ok) return;
    setBusy(true);
    const results: Outcome[] = [];
    // One id for this Add: the quizzes it makes can be listed together, and pressing it twice repeats nothing.
    const batch = crypto.randomUUID();
    let createdNew = 0;
    for (const g of todo) {
      const questions = g.rows.map(rowToContent);
      const target = targetOf(g);
      try {
        if (target === 'new') {
          const made = await client.createQuiz({
            title: groupTitle(g, subjectName(g.sid)),
            category: g.sid,
            ks: g.ks || null,
            intro: importIntro(g, subjectName(g.sid)),
            age_min: g.ages?.min ?? null,
            age_max: g.ages?.max ?? null,
            imported: true,
            ai_fixes: acceptedIn(g.rows),
            batch,
            questions,
          });
          if (!made.duplicate) createdNew += 1;
          results.push({
            key: g.key,
            ok: true,
            text: made.duplicate
              ? `Already in the library, skipped: “${groupTitle(g, subjectName(g.sid))}”`
              : `New draft “${groupTitle(g, subjectName(g.sid))}” with ${plural(questions.length, 'question', 'questions')}`,
            quizId: made.id,
            duplicate: made.duplicate,
          });
        } else {
          await client.append(target, questions, { imported: true, ai_fixes: acceptedIn(g.rows) });
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
          text: `${groupTitle(g, subjectName(g.sid))}: ${adminErrorMessage(err)}`,
          errors,
        });
      }
    }
    setOutcomes(results);
    setLastBatch(createdNew > 0 ? batch : null);
    setBusy(false);
    refreshCounts();
    quizzes.reload();
    const skipped = results.filter((r) => r.ok && r.duplicate).length;
    const made = results.filter((r) => r.ok).length - skipped;
    const parts = [
      made ? `Created ${plural(made, 'draft', 'drafts')}` : '',
      skipped ? `${skipped} already in the library` : '',
    ].filter(Boolean);
    if (parts.length) toast(parts.join(', '));
  };

  return (
    <>
      <AHead
        title="Import questions"
        lead="Paste from Notepad, Word or a spreadsheet, or drop a .txt, .csv or .md file. Imports become drafts with their questions already checked, so you can publish them straight away. Nothing goes live from here."
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
            <b className="text-content">Drop files</b> or{' '}
            <label className="cursor-pointer font-bold text-primary hover:underline">
              choose them
              <input
                type="file"
                multiple
                accept=".txt,.csv,.md,text/plain,text/csv,text/markdown"
                className="sr-only"
                onChange={(e) => {
                  void readFiles(Array.from(e.target.files ?? []));
                  e.target.value = '';
                }}
              />
            </label>{' '}
            · up to {MAX_IMPORT_FILES} files, 256 KB each
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
                  runId.current += 1;
                  setText('');
                  setParsed(null);
                  setOutcomes([]);
                  setReview({});
                  setFixState({});
                  setReviewing(null);
                  setFailed(null);
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
              <b>#</b> sets subject, key stage or age band (Ages 4–5, Adult) and topic for what
              follows. Each heading becomes its own quiz
            </li>
            <li>No heading? We guess the subject and you can change it</li>
            <li>
              An explanation can be added later but is needed to publish. A source is optional
            </li>
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
              {ready.filter((r) => r.later.length).length} need an explanation later
            </Pill>
            <Pill tone="grape">
              {ready.filter((r) => r.notes.length).length} worth a second look
            </Pill>
          </div>
          <div
            role="status"
            className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.06] p-3 text-sm"
          >
            {!reviewReady ? (
              <span className="font-bold">
                AI review off: add the generator keys to have the AI check these questions.
              </span>
            ) : reviewing ? (
              <span className="font-bold">
                AI is reviewing… {reviewing.done} of {plural(reviewing.total, 'call', 'calls')} done
              </span>
            ) : (
              <>
                <b>AI review</b>
                <span className="text-content-muted">
                  {plural(reviewable(rows).length, 'question', 'questions')}, about{' '}
                  {plural(reviewCalls, 'AI call', 'AI calls')}
                </span>
                {reviewedCount > 0 && (
                  <>
                    <Pill tone="ok">
                      {verdicts.filter((v) => v.verdict === 'ok').length} look fine
                    </Pill>
                    <Pill tone="grape">
                      {fixLines.length} fixes ({fixLines.length - pendingFixes.length} decided)
                    </Pill>
                    <Pill tone="warn">
                      {verdicts.filter((v) => v.verdict === 'flag').length} flagged
                    </Pill>
                  </>
                )}
                <Button
                  size="sm"
                  className="h-9"
                  variant={reviewedCount ? 'ghost' : 'primary'}
                  disabled={!reviewCalls}
                  onClick={() => void runReview(rows)}
                >
                  {reviewedCount ? 'Review again' : 'Review with AI'}
                </Button>
                {pendingFixes.length > 0 && (
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={() => setFix(pendingFixes, 'accepted')}
                  >
                    Accept all {plural(pendingFixes.length, 'fix', 'fixes')}
                  </Button>
                )}
              </>
            )}
            {failed && !reviewing && (
              <span className="font-bold text-wrong">
                {plural(failed.lines.length, 'question was', 'questions were')} not reviewed (
                {failed.message}).{' '}
                <button
                  type="button"
                  className={linkButtonClass}
                  onClick={() => void runReview(rows, new Set(failed.lines))}
                >
                  Retry
                </button>
              </span>
            )}
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
            {finalRows.map((r, i) => (
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
                    ) : r.q.type === 'build' || r.q.type === 'assign' ? (
                      <span>
                        Tiles: <b>{markedAnswer(r.q)}</b>
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
                    {(r.ks || r.ages) && (
                      <span className="text-xs text-content-muted">
                        {[r.ks, r.ages ? agesLabel(r.ages) : '', r.topic]
                          .filter(Boolean)
                          .join(' · ')}
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
                    {r.notes.map((e) => (
                      <span key={e} className="text-[12.5px] font-bold text-content-muted">
                        ? {e}
                      </span>
                    ))}
                    {!r.block.length && !r.later.length && !r.notes.length && !review[r.line] && (
                      <Pill tone="ok">Ready</Pill>
                    )}
                    {review[r.line] && rows[i] && (
                      <AiVerdict
                        question={rows[i].q}
                        item={review[r.line]!}
                        state={fixState[r.line] ?? 'pending'}
                        onAccept={() => setFix([r.line], 'accepted')}
                        onReject={() => setFix([r.line], 'rejected')}
                        onUndo={() => setFix([r.line], 'pending')}
                      />
                    )}
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
                    <b>{groupTitle(g, subjectName(g.sid))}</b>{' '}
                    <span className="text-sm text-content-muted">
                      {subjectName(g.sid)}
                      {g.ks ? ` · ${g.ks}` : ''} · {plural(g.rows.length, 'question', 'questions')}
                    </span>
                    {isNew && (
                      <p className="text-[12.5px] font-extrabold text-[#9A6400]">
                        Create the subject first.
                      </p>
                    )}
                    {g.rows.some((r) => review[r.line]?.fix) && (
                      <p className="text-[12.5px] font-bold text-content-muted">
                        AI fixes: {acceptedIn(g.rows)} accepted of{' '}
                        {g.rows.filter((r) => review[r.line]?.fix).length}{' '}
                        {g.rows.some((r) => pendingFixes.includes(r.line)) && (
                          <button
                            type="button"
                            className={linkButtonClass}
                            onClick={() =>
                              setFix(
                                g.rows.map((r) => r.line).filter((l) => pendingFixes.includes(l)),
                                'accepted',
                              )
                            }
                          >
                            Accept all for this quiz
                          </button>
                        )}
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
                    aria-label={`Where “${groupTitle(g, subjectName(g.sid))}” goes`}
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
              {lastBatch && (
                <div>
                  <Link to={`/admin/batch/${lastBatch}`}>
                    <Button size="sm">Review and publish this batch</Button>
                  </Link>
                </div>
              )}
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
