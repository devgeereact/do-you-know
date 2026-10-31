import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { WORLD_KEYS, isWorld, type WorldKey } from '@/lib/art';
import {
  LIMITS,
  blankQuestion,
  changeType,
  londonToday,
  textLength,
  toContent,
  validateQuestion,
  type FieldKey,
} from '@/lib/adminValidation';
import { cn } from '@/lib/utils';
import { world } from '@/lib/worlds';
import {
  AdminApiError,
  KEY_STAGES,
  adminErrorMessage,
  type Difficulty,
  type KeyStage,
  type Problem,
  type QuestionContent,
  type QuestionType,
  type QuizDetail,
  type SliderSpec,
  type StudioQuestion,
} from '@/services/adminService';
import { QuestionPreview } from '@/pages/admin/QuestionPreview';
import {
  inputClass,
  linkButtonClass,
  niceDate,
  quizState,
  selectClass,
  useAction,
  useStudio,
} from '@/pages/admin/studio';
import { AHead, Bar, Dot, ErrorNote, Field, Loading, Panel, Pill } from '@/pages/admin/ui';

/** A question being edited: the content plus a client key and what the server last said. */
type EditQ = QuestionContent & {
  key: string;
  checked: boolean;
  stats: StudioQuestion['stats'];
  scene_default?: WorldKey;
};

interface Meta {
  title: string;
  intro: string;
  category: string;
  ks: KeyStage | '';
  difficulty: Difficulty;
  time_limit_seconds: number | null;
}

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

let keySeq = 0;
const newKey = (): string => `k${(keySeq += 1)}`;

function fromServer(q: StudioQuestion, key?: string): EditQ {
  return { ...q, key: key ?? newKey() };
}

function metaOf(detail: QuizDetail): Meta {
  const q = detail.quiz;
  return {
    title: q.title ?? '',
    intro: q.intro ?? '',
    category: q.category ?? '',
    ks: q.ks ?? '',
    difficulty: q.difficulty ?? 'medium',
    time_limit_seconds: q.time_limit_seconds,
  };
}

const TYPE_LABEL: Record<QuestionType, string> = {
  choice: 'Pick one',
  boolean: 'True or false',
  slider: 'Slider',
};

const round = (n: number): number => Number(n.toFixed(10));

/** Edit a quiz: details, questions of all three types, a live preview and versions. */
export function EditorScreen(): JSX.Element {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { client, subjects, refreshCounts, toast, confirm } = useStudio();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const today = londonToday();

  const [detail, setDetail] = useState<QuizDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [questions, setQuestions] = useState<EditQ[]>([]);
  const [sel, setSel] = useState(0);
  const [save, setSave] = useState<SaveState>('idle');
  const [saveProblems, setSaveProblems] = useState<Problem[]>([]);

  // Every local edit bumps `edits`; a save only adopts the server copy if nothing changed since.
  const edits = useRef(0);
  const timer = useRef<number | null>(null);
  const latest = useRef<{ meta: Meta | null; questions: EditQ[] }>({ meta: null, questions: [] });
  latest.current = { meta, questions };
  const saving = useRef<Promise<void> | null>(null);

  const adopt = useCallback((next: QuizDetail, keepLocal: boolean) => {
    setDetail(next);
    if (keepLocal) {
      // Newer edits are on screen: only take ids and checked flags for matching positions.
      setQuestions((list) =>
        list.map((q, i) => {
          const s = next.questions[i];
          return s && (!q.id || q.id === s.id)
            ? { ...q, id: s.id, scene_default: s.scene_default, stats: s.stats }
            : q;
        }),
      );
      return;
    }
    setMeta(metaOf(next));
    setQuestions((list) => next.questions.map((q, i) => fromServer(q, list[i]?.key)));
  }, []);

  // Load.
  useEffect(() => {
    let live = true;
    setDetail(null);
    setLoadError(null);
    client
      .quiz(id)
      .then((d) => {
        if (!live) return;
        edits.current = 0;
        setDetail(d);
        setMeta(metaOf(d));
        setQuestions(d.questions.map((q) => fromServer(q)));
        const want = params.get('q');
        const at = want ? d.questions.findIndex((q) => q.id === want) : -1;
        setSel(at >= 0 ? at : 0);
        setSave('idle');
      })
      .catch((err: unknown) => live && setLoadError(adminErrorMessage(err)));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per quiz
  }, [client, id]);

  const doSave = useCallback(async (): Promise<void> => {
    const { meta: m, questions: qs } = latest.current;
    if (!m) return;
    const at = edits.current;
    setSave('saving');
    try {
      const next = await client.saveQuiz(id, {
        meta: {
          title: m.title,
          intro: m.intro,
          category: m.category,
          ks: m.ks || null,
          difficulty: m.difficulty,
          time_limit_seconds: m.time_limit_seconds,
        },
        questions: qs.map((q) => toContent(q)),
      });
      adopt(next, edits.current !== at);
      setSaveProblems([]);
      setSave(edits.current !== at ? 'pending' : 'saved');
    } catch (err) {
      setSave('error');
      setSaveProblems(err instanceof AdminApiError ? err.problems : []);
      toast(adminErrorMessage(err), 'bad');
    }
  }, [adopt, client, id, toast]);

  /** Saves now if anything is waiting; resolves once the server has the latest copy. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (saving.current) await saving.current;
    if (save === 'pending' || save === 'error') {
      saving.current = doSave();
      await saving.current;
      saving.current = null;
    }
    return true;
  }, [doSave, save]);

  const touched = useCallback(() => {
    edits.current += 1;
    setSave('pending');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const go = async (): Promise<void> => {
        if (saving.current) await saving.current;
        saving.current = doSave();
        await saving.current;
        saving.current = null;
      };
      void go();
    }, 900);
  }, [doSave]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const editMeta = (patch: Partial<Meta>): void => {
    setMeta((m) => (m ? { ...m, ...patch } : m));
    touched();
  };
  const editQ = (index: number, next: (q: EditQ) => EditQ): void => {
    setQuestions((list) => list.map((q, i) => (i === index ? { ...next(q), checked: false } : q)));
    touched();
  };

  const problemsAt = useMemo(() => {
    const map = new Map<number, Problem[]>();
    for (const p of [...(detail?.problems ?? []), ...saveProblems]) {
      if (typeof p.index !== 'number') continue;
      map.set(p.index, [...(map.get(p.index) ?? []), p]);
    }
    return map;
  }, [detail, saveProblems]);

  if (loadError) {
    return (
      <>
        <AHead
          title="Quiz not found"
          above={
            <Link to="/admin/library" className={linkButtonClass}>
              ‹ Library
            </Link>
          }
        />
        <ErrorNote message={loadError} />
      </>
    );
  }
  if (!detail || !meta) return <Loading />;

  const quiz = detail.quiz;
  const retired = quiz.status === 'retired';
  const q = questions[sel];
  const localErrors = q ? validateQuestion(q) : [];
  const serverErrors = q && !save.startsWith('p') ? (problemsAt.get(sel) ?? []) : [];
  const fieldErrors = (field: FieldKey): string[] => {
    const local = localErrors.filter((e) => e.field === field).map((e) => e.message);
    if (local.length) return local;
    return serverErrors.filter((e) => e.field === field).map((e) => capitalise(e.message));
  };
  const otherServerErrors = serverErrors.filter(
    (e) =>
      !['prompt', 'options', 'answer', 'slider', 'explanation', 'source_url', 'review_by'].includes(
        e.field,
      ),
  );
  const problems = detail.problems;
  const dirty = save === 'pending' || save === 'saving' || save === 'error';
  const canSend = !dirty && problems.length === 0 && questions.length >= LIMITS.minQuestions;
  const fallbackWorld: WorldKey =
    q?.scene_default ?? subjects.find((s) => s.slug === meta.category)?.scene ?? 'ocean';
  const rate =
    q && q.stats.answered > 0 ? Math.round((100 * q.stats.right) / q.stats.answered) : null;

  const act = async (
    action: () => Promise<QuizDetail>,
    success: string,
    after?: () => void,
  ): Promise<void> => {
    await flush();
    const next = await run(action, success);
    if (next) {
      edits.current = 0;
      adopt(next, false);
      setSave('idle');
      refreshCounts();
      after?.();
    }
  };

  const addQuestion = (type: QuestionType): void => {
    if (questions.length >= LIMITS.maxQuestions) {
      toast('A quiz can have up to 50 questions.', 'bad');
      return;
    }
    setQuestions((list) => [
      ...list,
      {
        ...blankQuestion(type, today),
        key: newKey(),
        checked: false,
        stats: { answered: 0, right: 0 },
      },
    ]);
    setSel(questions.length);
    touched();
  };

  const removeQuestion = async (): Promise<void> => {
    if (!q) return;
    const ok = await confirm({
      title: `Remove question ${sel + 1}?`,
      body: quiz.version
        ? 'It leaves the work copy now. Players keep seeing it until you publish a new version.'
        : 'It leaves this draft.',
      confirmLabel: 'Remove question',
      tone: 'danger',
    });
    if (!ok) return;
    setQuestions((list) => list.filter((_, i) => i !== sel));
    setSel((s) => Math.max(0, Math.min(s, questions.length - 2)));
    touched();
  };

  let actions: JSX.Element | null = null;
  if (retired) {
    actions = (
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          const ok = await confirm({
            title: 'Restore this quiz?',
            body: quiz.version
              ? 'It goes back to live with its last published version.'
              : 'It goes back to the drafts.',
            confirmLabel: 'Restore',
          });
          if (ok) await act(() => client.restore(id), 'Quiz restored');
        }}
      >
        Restore…
      </Button>
    );
  } else if (quiz.in_review) {
    actions = (
      <>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void act(() => client.unsubmit(id), 'Back to draft')}
        >
          Back to draft
        </Button>
        <Button size="sm" onClick={() => navigate(`/admin/check?quiz=${id}`)}>
          Open check queue
        </Button>
      </>
    );
  } else {
    const live = quiz.status === 'published';
    actions = (
      <>
        {live && quiz.has_draft && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={async () => {
              const ok = await confirm({
                title: 'Discard your edits?',
                body: 'The work copy goes back to the live version. This can’t be undone.',
                confirmLabel: 'Discard edits',
                tone: 'danger',
              });
              if (ok) await act(() => client.discard(id), 'Edits discarded');
            }}
          >
            Discard edits…
          </Button>
        )}
        {(!live || quiz.has_draft || dirty) && (
          <Button
            size="sm"
            disabled={busy || !canSend}
            title={canSend ? undefined : 'Fix the problems shown and wait for the save first'}
            onClick={() =>
              void act(
                () => client.submit(id),
                'Sent to Check & publish',
                () => navigate(`/admin/check?quiz=${id}`),
              )
            }
          >
            {live ? 'Send edits to check' : 'Send to check'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="!border-wrong/40 !text-wrong"
          onClick={async () => {
            const ok = await confirm({
              title: 'Retire this quiz?',
              body: live
                ? 'Players stop seeing it straight away and any future dailies for it are removed. Nothing is deleted; you can restore it.'
                : 'It leaves the drafts. Nothing is deleted; you can restore it.',
              confirmLabel: 'Retire quiz',
              tone: 'danger',
            });
            if (ok) await act(() => client.retire(id), 'Quiz retired');
          }}
        >
          Retire…
        </Button>
      </>
    );
  }

  const saveText =
    save === 'saving'
      ? 'Saving…'
      : save === 'pending'
        ? 'Unsaved changes…'
        : save === 'error'
          ? 'Couldn’t save'
          : save === 'saved'
            ? 'All changes saved'
            : 'Edits save automatically';

  return (
    <>
      <AHead
        above={
          <Link to="/admin/library" className={linkButtonClass}>
            ‹ Library
          </Link>
        }
        title={meta.title.trim() || 'Untitled quiz'}
        below={
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {quizState(quiz).map((p) => (
              <Pill key={p.label} tone={p.tone}>
                {p.label}
              </Pill>
            ))}
            <span className="text-sm text-content-muted">
              {quiz.version ? `Live version v${quiz.version}` : 'Never published'} ·{' '}
              <span role="status" className={save === 'error' ? 'font-bold text-wrong' : undefined}>
                {saveText}
              </span>
            </span>
            {save === 'error' && (
              <button type="button" className={linkButtonClass} onClick={() => void flush()}>
                Retry
              </button>
            )}
          </div>
        }
        actions={actions}
      />

      {problems.length > 0 && !retired && (
        <div className="mb-3 rounded-2xl border border-wrong/25 bg-wrong/[0.07] px-4 py-3">
          <b className="text-sm">
            {problems.length === 1 ? '1 thing' : `${problems.length} things`} to fix before this can
            be checked
          </b>
          <p className="mt-0.5 text-xs text-content-muted">
            {problems
              .slice(0, 3)
              .map((p) =>
                typeof p.index === 'number'
                  ? `Question ${p.index + 1}: ${p.message}`
                  : capitalise(p.message),
              )
              .join(' · ')}
            {problems.length > 3 ? ' …' : ''}
          </p>
        </div>
      )}
      {quiz.in_review && (
        <p className="mb-3 rounded-2xl bg-warning/15 px-4 py-2.5 text-sm font-semibold">
          Waiting for checks. Any edit here sends it back to draft.
        </p>
      )}

      <fieldset
        disabled={retired}
        className="grid min-w-0 gap-4 min-[1200px]:grid-cols-[240px_minmax(0,1fr)_260px] min-[1400px]:grid-cols-[280px_minmax(0,1fr)_300px]"
      >
        <legend className="sr-only">Quiz editor</legend>
        {/* Details and question list */}
        <div className="grid min-w-0 content-start gap-4 md:grid-cols-2 min-[1200px]:grid-cols-1">
          <Panel as="div" className="grid content-start gap-3 !p-4">
            <Field label="Title" htmlFor="ed-title">
              <input
                id="ed-title"
                className={inputClass}
                maxLength={255}
                value={meta.title}
                onChange={(e) => editMeta({ title: e.target.value })}
              />
            </Field>
            <Field
              label="Intro"
              htmlFor="ed-intro"
              hint={`${textLength(meta.intro)}/400`}
              errors={
                textLength(meta.intro) > 400
                  ? ['Keep the intro to 400 characters']
                  : !meta.intro.trim()
                    ? ['Write a short intro. Players see it before they start']
                    : undefined
              }
            >
              <textarea
                id="ed-intro"
                className={inputClass}
                rows={3}
                value={meta.intro}
                onChange={(e) => editMeta({ intro: e.target.value.replace(/\n/g, ' ') })}
              />
            </Field>
            <Field label="Subject" htmlFor="ed-subject">
              <select
                id="ed-subject"
                className={selectClass}
                value={meta.category}
                onChange={(e) => editMeta({ category: e.target.value })}
              >
                {!subjects.some((s) => s.slug === meta.category) && (
                  <option value={meta.category}>{quiz.category_name ?? meta.category}</option>
                )}
                {subjects.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                    {s.kind === 'school' ? ' (school)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Key stage" htmlFor="ed-ks">
                <select
                  id="ed-ks"
                  className={selectClass}
                  value={meta.ks}
                  onChange={(e) => editMeta({ ks: e.target.value as KeyStage | '' })}
                >
                  <option value="">All ages</option>
                  {KEY_STAGES.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Difficulty" htmlFor="ed-diff">
                <select
                  id="ed-diff"
                  className={selectClass}
                  value={meta.difficulty}
                  onChange={(e) => editMeta({ difficulty: e.target.value as Difficulty })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
              <Field
                label="Seconds each"
                htmlFor="ed-secs"
                errors={
                  meta.time_limit_seconds !== null &&
                  (meta.time_limit_seconds < 5 || meta.time_limit_seconds > 120)
                    ? ['5 to 120, or empty for no timer']
                    : undefined
                }
              >
                <input
                  id="ed-secs"
                  type="number"
                  min={5}
                  max={120}
                  className={inputClass}
                  value={meta.time_limit_seconds ?? ''}
                  placeholder="No timer"
                  onChange={(e) =>
                    editMeta({
                      time_limit_seconds:
                        e.target.value === '' ? null : Math.round(+e.target.value),
                    })
                  }
                />
              </Field>
            </div>
          </Panel>

          <Panel as="div" className="!p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <b className="text-sm">Questions ({questions.length})</b>
              <span className="flex items-center gap-1.5 text-xs text-content-muted">
                <Dot tone="bad" /> fix <Dot tone="wait" /> check <Dot tone="ok" /> ok
              </span>
            </div>
            <ol className="grid max-h-[52vh] gap-1 overflow-auto pr-0.5">
              {questions.map((x, i) => {
                const bad = validateQuestion(x).length > 0 || (problemsAt.get(i)?.length ?? 0) > 0;
                const tone = bad ? 'bad' : x.checked ? 'ok' : 'wait';
                const r = x.stats.answered
                  ? `${Math.round((100 * x.stats.right) / x.stats.answered)}%`
                  : '';
                return (
                  <li key={x.key}>
                    <button
                      type="button"
                      aria-current={i === sel}
                      onClick={() => setSel(i)}
                      className={cn(
                        'grid w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border-[1.5px] px-2 py-[7px] text-left text-[13.5px] font-bold disabled:opacity-100',
                        i === sel
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:bg-content/[0.04]',
                      )}
                      disabled={false}
                    >
                      <Dot
                        tone={tone}
                        label={bad ? 'Has problems' : x.checked ? 'Checked' : 'Not checked'}
                      />
                      <span className="truncate">
                        {i + 1}. {x.prompt.trim() || 'New question'}
                      </span>
                      <span className="text-xs font-semibold text-content-muted">{r}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {questions.length === 0 && (
              <p className="py-3 text-sm text-content-muted">No questions yet.</p>
            )}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-1 text-[13px]"
                onClick={() => addQuestion('choice')}
              >
                + Choice
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-1 text-[13px]"
                onClick={() => addQuestion('boolean')}
              >
                + True/false
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-1 text-[13px]"
                onClick={() => addQuestion('slider')}
              >
                + Slider
              </Button>
            </div>
          </Panel>
        </div>

        {/* Question form */}
        {q ? (
          <Panel className="grid min-w-0 content-start gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-extrabold">Question {sel + 1}</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="ed-type" className="sr-only">
                  Question type
                </label>
                <select
                  id="ed-type"
                  className={`${selectClass} h-9 w-auto`}
                  value={q.type}
                  onChange={(e) =>
                    editQ(sel, (x) => ({
                      ...x,
                      ...changeType(x, e.target.value as QuestionType, today),
                      key: x.key,
                    }))
                  }
                >
                  {(['choice', 'boolean', 'slider'] as const).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3"
                  disabled={quiz.status !== 'draft' && questions.length <= LIMITS.minQuestions}
                  onClick={() => void removeQuestion()}
                >
                  Remove
                </Button>
              </div>
            </div>

            <Field
              label="Question"
              htmlFor="ed-prompt"
              hint={`${textLength(q.prompt)}/${LIMITS.prompt}`}
              errors={fieldErrors('prompt')}
            >
              <textarea
                id="ed-prompt"
                rows={2}
                className={cn(inputClass, fieldErrors('prompt').length && 'border-wrong')}
                value={q.prompt}
                onChange={(e) =>
                  editQ(sel, (x) => ({ ...x, prompt: e.target.value.replace(/\n/g, ' ') }))
                }
              />
            </Field>

            {q.type === 'choice' && (
              <Field label="Answers · tick the right one (2 to 6)" errors={fieldErrors('options')}>
                <div className="grid gap-1.5">
                  {(q.options ?? []).map((o, k) => (
                    <div
                      key={k}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
                    >
                      <input
                        type="radio"
                        name={`right-${q.key}`}
                        checked={o.correct}
                        aria-label={`Answer ${k + 1} is right`}
                        className="h-5 w-5 accent-[#1FB57A]"
                        onChange={() =>
                          editQ(sel, (x) => ({
                            ...x,
                            options: (x.options ?? []).map((p, j) => ({ ...p, correct: j === k })),
                          }))
                        }
                      />
                      <input
                        className={inputClass}
                        value={o.label}
                        maxLength={LIMITS.option}
                        aria-label={`Answer ${k + 1}`}
                        onChange={(e) =>
                          editQ(sel, (x) => ({
                            ...x,
                            options: (x.options ?? []).map((p, j) =>
                              j === k ? { ...p, label: e.target.value } : p,
                            ),
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-full border-2 border-surface-border text-content-muted hover:border-wrong/40 hover:text-wrong disabled:opacity-40"
                        aria-label={`Remove answer ${k + 1}`}
                        disabled={(q.options ?? []).length <= LIMITS.minOptions}
                        onClick={() =>
                          editQ(sel, (x) => {
                            const rest = (x.options ?? []).filter((_, j) => j !== k);
                            if (!rest.some((p) => p.correct) && rest[0])
                              rest[0] = { ...rest[0], correct: true };
                            return { ...x, options: rest };
                          })
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(q.options ?? []).length < LIMITS.maxOptions && (
                    <button
                      type="button"
                      className={`${linkButtonClass} justify-self-start`}
                      onClick={() =>
                        editQ(sel, (x) => ({
                          ...x,
                          options: [...(x.options ?? []), { label: '', correct: false }],
                        }))
                      }
                    >
                      + Add answer
                    </button>
                  )}
                </div>
              </Field>
            )}

            {q.type === 'boolean' && (
              <Field label="Right answer" errors={fieldErrors('answer')}>
                <div
                  role="group"
                  aria-label="Right answer"
                  className="inline-flex gap-0.5 rounded-full bg-content/[0.06] p-[3px]"
                >
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      aria-pressed={q.answer === v}
                      onClick={() => editQ(sel, (x) => ({ ...x, answer: v }))}
                      className={cn(
                        'h-8 rounded-full px-5 text-sm font-extrabold',
                        q.answer === v ? 'bg-surface shadow-soft' : 'text-content-muted',
                      )}
                    >
                      {v ? 'True' : 'False'}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {q.type === 'slider' && q.slider && (
              <SliderFields
                slider={q.slider}
                errors={fieldErrors('slider')}
                onChange={(slider) => editQ(sel, (x) => ({ ...x, slider }))}
              />
            )}

            <Field
              label="Explanation"
              htmlFor="ed-expl"
              hint={`${textLength(q.explanation)}/${LIMITS.explanation}`}
              errors={fieldErrors('explanation')}
            >
              <textarea
                id="ed-expl"
                rows={3}
                className={cn(inputClass, fieldErrors('explanation').length && 'border-wrong')}
                value={q.explanation ?? ''}
                onChange={(e) =>
                  editQ(sel, (x) => ({ ...x, explanation: e.target.value.replace(/\n/g, ' ') }))
                }
              />
            </Field>
            <Field label="Source link" htmlFor="ed-src" errors={fieldErrors('source_url')}>
              <input
                id="ed-src"
                type="url"
                inputMode="url"
                placeholder="https://"
                className={cn(inputClass, fieldErrors('source_url').length && 'border-wrong')}
                value={q.source_url ?? ''}
                onChange={(e) => editQ(sel, (x) => ({ ...x, source_url: e.target.value }))}
              />
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Re-check by" htmlFor="ed-review" errors={fieldErrors('review_by')}>
                <input
                  id="ed-review"
                  type="date"
                  className={inputClass}
                  value={q.review_by ?? ''}
                  onChange={(e) => editQ(sel, (x) => ({ ...x, review_by: e.target.value || null }))}
                />
              </Field>
              <Field label="World" htmlFor="ed-world">
                <select
                  id="ed-world"
                  className={selectClass}
                  value={q.scene ?? ''}
                  onChange={(e) =>
                    editQ(sel, (x) => ({
                      ...x,
                      scene: isWorld(e.target.value) ? e.target.value : null,
                    }))
                  }
                >
                  <option value="">
                    Auto{q.scene_default ? `: ${world(q.scene_default).name}` : ''}
                  </option>
                  {WORLD_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {world(k).name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {otherServerErrors.map((e) => (
              <p key={e.message} className="text-[13px] font-bold text-wrong">
                {capitalise(e.message)}
              </p>
            ))}
          </Panel>
        ) : (
          <Panel>
            <p className="py-8 text-center font-semibold text-content-muted">
              No questions yet. Add one on the left.
            </p>
          </Panel>
        )}

        {/* Preview, stats and versions */}
        <aside className="grid min-w-0 content-start gap-4 md:grid-cols-2 min-[1200px]:grid-cols-1">
          {q && (
            <div className="min-w-0">
              <p className="mb-1.5 text-sm font-bold">Preview</p>
              <QuestionPreview question={q} fallbackWorld={fallbackWorld} />
            </div>
          )}
          <div className="grid content-start gap-4">
            {q && (
              <Panel as="div" className="!p-4">
                <b className="text-sm">How players do</b>
                {rate === null ? (
                  <p className="mt-1 text-xs text-content-muted">No answers yet.</p>
                ) : (
                  <>
                    <div className="my-1.5 flex items-center gap-2">
                      <Bar percent={rate} tone={rate < 30 ? 'bad' : 'ok'} />
                      <b className="text-sm">{rate}%</b>
                    </div>
                    <p className="text-xs text-content-muted">
                      {q.stats.answered.toLocaleString('en-GB')} answers.{' '}
                      {rate < 30
                        ? 'Most get this wrong. Check the marked answer and the wording.'
                        : 'Looks healthy.'}
                    </p>
                  </>
                )}
              </Panel>
            )}
            <Panel as="div" className="!p-4">
              <b className="text-sm">Versions</b>
              <ul className="mt-1.5 text-[13.5px]">
                {detail.versions.length === 0 && (
                  <li className="border-t border-surface-border/70 py-1.5 text-content-muted">
                    Not published yet
                  </li>
                )}
                {detail.versions.map((v) => (
                  <li
                    key={v.version}
                    className="flex justify-between gap-2 border-t border-surface-border/70 py-1.5"
                  >
                    <span>
                      v{v.version}
                      {v.live ? ' · live' : ''}{' '}
                      <span className="text-content-muted">({v.question_count} a round)</span>
                    </span>
                    <span className="text-content-muted">{niceDate(v.created_at)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </aside>
      </fieldset>
    </>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function numberValue(n: number): string {
  return Number.isFinite(n) ? String(n) : '';
}

function SliderFields({
  slider,
  errors,
  onChange,
}: {
  slider: SliderSpec;
  errors: string[];
  onChange: (s: SliderSpec) => void;
}): JSX.Element {
  const below = slider.correct - slider.accept_min;
  const above = slider.accept_max - slider.correct;
  const num = (v: string): number => (v.trim() === '' ? Number.NaN : Number(v));
  const fields: { key: string; label: string; value: string; set: (v: string) => void }[] = [
    {
      key: 'min',
      label: 'Min',
      value: numberValue(slider.min),
      set: (v) => onChange({ ...slider, min: num(v) }),
    },
    {
      key: 'max',
      label: 'Max',
      value: numberValue(slider.max),
      set: (v) => onChange({ ...slider, max: num(v) }),
    },
    {
      key: 'step',
      label: 'Step',
      value: numberValue(slider.step),
      set: (v) => onChange({ ...slider, step: num(v) }),
    },
    {
      key: 'correct',
      label: 'Right answer',
      value: numberValue(slider.correct),
      set: (v) => {
        const c = num(v);
        onChange({
          ...slider,
          correct: c,
          accept_min: Number.isFinite(c) && Number.isFinite(below) ? round(c - below) : c,
          accept_max: Number.isFinite(c) && Number.isFinite(above) ? round(c + above) : c,
        });
      },
    },
    {
      key: 'tol',
      label: 'Accept ±',
      value: numberValue(above),
      set: (v) => {
        const t = Math.abs(num(v));
        onChange({
          ...slider,
          accept_min: Number.isFinite(t) ? round(slider.correct - t) : slider.correct,
          accept_max: Number.isFinite(t) ? round(slider.correct + t) : slider.correct,
        });
      },
    },
  ];
  return (
    <Field label="Slider" errors={errors}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key} className="min-w-0">
            <label
              htmlFor={`sl-${f.key}`}
              className="mb-0.5 block text-xs font-bold text-content-muted"
            >
              {f.label}
            </label>
            <input
              id={`sl-${f.key}`}
              type="number"
              step="any"
              className={inputClass}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
            />
          </div>
        ))}
        <div className="min-w-0">
          <label htmlFor="sl-unit" className="mb-0.5 block text-xs font-bold text-content-muted">
            Unit
          </label>
          <input
            id="sl-unit"
            className={inputClass}
            maxLength={LIMITS.unit}
            value={slider.unit ?? ''}
            placeholder="e.g. days"
            onChange={(e) => onChange({ ...slider, unit: e.target.value })}
          />
        </div>
      </div>
      {below !== above && Number.isFinite(below) && (
        <p className="mt-1 text-xs text-content-muted">
          Accepts {slider.accept_min} to {slider.accept_max}.
        </p>
      )}
    </Field>
  );
}
