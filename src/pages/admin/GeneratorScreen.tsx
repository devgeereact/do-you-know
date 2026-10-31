import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type {
  GeneratorAges,
  GeneratorDraft,
  GeneratorRun,
  GeneratorStage,
  GeneratorStatus,
} from '@/services/adminService';
import {
  hostOf,
  inputClass,
  linkButtonClass,
  niceDateTime,
  selectClass,
  useAction,
  useLoad,
  useStudio,
} from '@/pages/admin/studio';
import { AHead, ErrorNote, Field, Loading, Panel, Pill } from '@/pages/admin/ui';

const STEPS: { stage: GeneratorStage; label: string }[] = [
  { stage: 'search', label: 'Search trusted sites' },
  { stage: 'fetch', label: 'Read the pages' },
  { stage: 'draft', label: 'Write from that text' },
  { stage: 'check', label: 'Check every quote' },
  { stage: 'done', label: 'Ready for you' },
];
const ORDER: GeneratorStage[] = ['search', 'fetch', 'draft', 'check', 'done'];

const FAILURES: Record<string, string> = {
  no_trusted_sources:
    'No pages from the trusted sites matched this topic. Try wording it differently.',
  no_readable_pages: 'The trusted pages found could not be read. Try another topic.',
  generator_refused: 'The model declined this topic. Try wording it differently.',
  generator_busy: 'The model was busy. Run it again in a minute.',
  generator_model_error: 'The model returned an error. Run it again.',
  generator_model_unreachable: 'Couldn’t reach the model. Run it again.',
  generator_bad_output: 'The model’s answer could not be read. Run it again.',
  generator_too_long: 'The answer was too long. Ask for fewer questions.',
  generator_search_failed: 'The search failed. Run it again.',
  generator_fetch_failed: 'Fetching from Bright Data failed. Check the zone names in the settings.',
};

/**
 * Sourced question generator: Bright Data finds pages on trusted sites, Claude writes questions
 * only from that text, the server checks every quote. A person approves drafts and sends them to
 * a quiz, which still goes through Check & publish. Off until the owner switches it on.
 */
export function GeneratorScreen(): JSX.Element {
  const { client } = useStudio();
  const status = useLoad(() => client.generator(), []);
  const [run, setRun] = useState<GeneratorRun | null>(null);

  if (status.loading && !status.data) return <Loading />;
  if (status.error || !status.data)
    return <ErrorNote message={status.error ?? 'Could not load.'} onRetry={status.reload} />;
  const s = status.data;

  return (
    <>
      <AHead
        title="Question generator"
        lead="Questions written only from trusted pages, each with the exact quote. Every draft goes through Check & publish."
        above={<StatePill s={s} />}
      />
      {!s.ready && <OffNotice s={s} />}
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        <StartForm
          s={s}
          onStarted={(r) => {
            setRun(r);
            status.reload();
          }}
        />
        <div className="min-w-0 space-y-4">
          {run ? (
            <RunView
              key={run.id}
              initial={run}
              onFinished={status.reload}
              onUpdate={(r) => setRun(r)}
            />
          ) : (
            <Panel>
              <h2 className="font-display text-xl font-extrabold">How a run works</h2>
              <ol className="mt-3 grid gap-2 text-sm text-content-muted">
                <li>1. Bright Data searches only the trusted sites for your topic.</li>
                <li>2. Up to four pages are read and kept with the run.</li>
                <li>
                  3. Claude writes questions using only that text, quoting the page each time.
                </li>
                <li>
                  4. The server checks each quote is on the page, the page is trusted and the
                  question is new.
                </li>
                <li>5. You approve the good ones and send them to a quiz to check and publish.</li>
              </ol>
            </Panel>
          )}
        </div>
        <SidePanel
          s={s}
          onOpen={(id) =>
            client
              .run(id)
              .then(setRun)
              .catch(() => undefined)
          }
        />
      </div>
    </>
  );
}

function StatePill({ s }: { s: GeneratorStatus }): JSX.Element {
  if (s.ready) return <Pill tone="ok">Switched on</Pill>;
  return <Pill tone="warn">Switched off until the cost is approved</Pill>;
}

function OffNotice({ s }: { s: GeneratorStatus }): JSX.Element {
  const missing = [
    !s.enabled && '“enabled” is false',
    !s.configured.claude && 'the Claude API key',
    !s.configured.bright_data && 'the Bright Data key and zone names',
  ].filter(Boolean);
  return (
    <div className="mb-4 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <p className="font-bold text-content">Nothing here costs money until it is switched on.</p>
      <p className="mt-1 text-content-muted">
        Missing in the private server settings (<code>generator</code>): {missing.join(', ')}. Each
        run then uses about one search, up to four page fetches and one Claude call.
      </p>
    </div>
  );
}

function StartForm({
  s,
  onStarted,
}: {
  s: GeneratorStatus;
  onStarted: (run: GeneratorRun) => void;
}): JSX.Element {
  const { client, subjects } = useStudio();
  const { busy, run } = useAction();
  const [topic, setTopic] = useState('');
  const [ages, setAges] = useState<GeneratorAges>('7-11');
  const [count, setCount] = useState(10);
  const [category, setCategory] = useState('');
  const ids = { topic: useId(), count: useId(), subject: useId() };
  const capLeft = Math.max(0, s.cap.limit - s.cap.used);
  const disabled = !s.ready || capLeft === 0 || busy;

  return (
    <Panel
      as="form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() =>
          client.startRun({
            topic: topic.trim(),
            ages,
            count,
            ...(category ? { category } : {}),
          }),
        ).then((r) => r && onStarted(r));
      }}
    >
      <Field label="What should the questions cover?" htmlFor={ids.topic}>
        <textarea
          id={ids.topic}
          rows={3}
          maxLength={300}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="The water cycle: evaporation, condensation, precipitation"
          className={cn(inputClass, 'h-auto py-2')}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Subject" htmlFor={ids.subject}>
          <select
            id={ids.subject}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClass}
          >
            <option value="">Any</option>
            {subjects.map((sub) => (
              <option key={sub.slug} value={sub.slug}>
                {sub.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="How many" htmlFor={ids.count} hint="3 to 15">
          <input
            id={ids.count}
            type="number"
            min={3}
            max={15}
            value={count}
            onChange={(e) => setCount(Math.min(15, Math.max(3, Number(e.target.value) || 3)))}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Ages">
        <div role="group" aria-label="Ages" className="flex flex-wrap gap-1.5">
          {s.ages.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={ages === a}
              onClick={() => setAges(a)}
              className={cn(
                'h-8 rounded-full border px-3 text-sm font-bold',
                ages === a
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-surface-border bg-surface text-content',
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </Field>
      <div className="rounded-xl bg-background p-3 text-sm">
        <p className="font-bold">Model</p>
        <p className="font-mono text-[13px] text-content-muted">{s.model}</p>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-bold">Trusted sources</p>
        <div className="flex flex-wrap gap-1.5">
          {s.sources.map((d) => (
            <Pill key={d} tone="grape">
              {d}
            </Pill>
          ))}
        </div>
      </div>
      <div className="space-y-1 rounded-xl bg-background p-3 text-sm">
        <div className="flex justify-between">
          <span className="font-bold">Runs today</span>
          <span className="tabular-nums">
            {s.cap.used} / {s.cap.limit}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-content/10">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${s.cap.limit ? Math.min(100, (s.cap.used / s.cap.limit) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={disabled || topic.trim().length < 3}>
        {busy ? 'Starting…' : 'Find sources and draft'}
      </Button>
    </Panel>
  );
}

function RunView({
  initial,
  onFinished,
  onUpdate,
}: {
  initial: GeneratorRun;
  onFinished: () => void;
  onUpdate: (run: GeneratorRun) => void;
}): JSX.Element {
  const { client, toast } = useStudio();
  const [run, setRun] = useState(initial);
  const finished = run.stage === 'done' || run.stage === 'failed';

  // Each step does one bounded piece of work on the server; keep asking until the run settles.
  useEffect(() => {
    if (finished) return;
    let cancelled = false;
    void (async () => {
      let current = run;
      while (!cancelled && current.stage !== 'done' && current.stage !== 'failed') {
        try {
          current = await client.stepRun(current.id);
        } catch {
          toast('The run stopped. Open it again from Recent runs to carry on.', 'bad');
          return;
        }
        if (cancelled) return;
        setRun(current);
        onUpdate(current);
        // Another tab is working on this step: wait before asking again.
        if (current.busy) {
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }
      }
      if (!cancelled) onFinished();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per run id
  }, [run.id]);

  const kept = run.drafts.filter((d) => d.kept);
  const approved = run.drafts.filter((d) => d.decision === 'approved');

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-extrabold">{run.topic}</h2>
          <span className="text-xs text-content-muted">
            {run.usage.search_calls} search · {run.usage.page_calls} pages ·{' '}
            {(run.usage.input_tokens + run.usage.output_tokens).toLocaleString()} tokens
          </span>
        </div>
        <Steps stage={run.stage} />
        {run.stage === 'failed' && (
          <p role="alert" className="mt-3 rounded-xl bg-wrong/10 p-3 text-sm font-bold text-wrong">
            {FAILURES[run.error ?? ''] ?? 'The run stopped.'}
          </p>
        )}
        {run.sources.length > 0 && (
          <ul className="mt-3 grid gap-1 text-sm">
            {run.sources.map((src) => (
              <li key={src.url} className="flex items-center gap-2">
                <Pill tone={src.state === 'read' ? 'ok' : src.state === 'waiting' ? 'mute' : 'bad'}>
                  {src.state === 'read'
                    ? 'Read'
                    : src.state === 'waiting'
                      ? 'Waiting'
                      : 'Unreadable'}
                </Pill>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-semibold text-primary hover:underline"
                >
                  {src.title || hostOf(src.url)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {run.stage === 'done' && (
        <>
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-extrabold">
                Drafts{' '}
                <span className="text-base font-semibold text-content-muted">
                  {kept.length} kept of {run.drafts.length}
                </span>
              </h2>
            </div>
            <div className="mt-3 grid gap-3">
              {run.drafts.map((d) => (
                <DraftCard key={d.id} draft={d} onChange={(next) => setRun(next)} run={run} />
              ))}
            </div>
          </Panel>
          {approved.length > 0 && <SendPanel run={run} approved={approved} onSent={setRun} />}
        </>
      )}
    </>
  );
}

function Steps({ stage }: { stage: GeneratorStage }): JSX.Element {
  const at = stage === 'failed' ? -1 : ORDER.indexOf(stage);
  return (
    <ol className="mt-3 grid grid-cols-5 gap-2" aria-label="Progress">
      {STEPS.map((step, i) => {
        const done = at > i || stage === 'done';
        const now = at === i && stage !== 'done';
        return (
          <li key={step.stage} className="grid gap-1.5" aria-current={now ? 'step' : undefined}>
            <span
              className={cn(
                'h-1.5 rounded-full',
                done ? 'bg-correct' : now ? 'animate-pulse bg-primary' : 'bg-content/10',
              )}
            />
            <span
              className={cn(
                'text-xs font-bold',
                done || now ? 'text-content' : 'text-content-muted',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DraftCard({
  draft,
  run,
  onChange,
}: {
  draft: GeneratorDraft;
  run: GeneratorRun;
  onChange: (run: GeneratorRun) => void;
}): JSX.Element {
  const { client } = useStudio();
  const { busy, run: act } = useAction();
  const q = draft.question;
  const decide = (decision: 'approved' | 'rejected' | 'pending'): void => {
    void act(() => client.decideDraft(draft.id, decision)).then((d) => {
      if (d) onChange({ ...run, drafts: run.drafts.map((x) => (x.id === d.id ? d : x)) });
    });
  };
  const checks: [boolean, string][] = [
    [draft.checks.quote_found, 'Quote is on the page'],
    [draft.checks.on_allowlist, 'Trusted source'],
    [draft.checks.new_prompt, 'Not already in a quiz'],
  ];
  return (
    <article
      className={cn(
        'grid gap-3 rounded-2xl border p-4',
        draft.decision === 'approved' || draft.decision === 'sent'
          ? 'border-correct/40 bg-correct/[0.04]'
          : draft.decision === 'rejected'
            ? 'border-surface-border opacity-60'
            : 'border-surface-border',
      )}
    >
      <div className="min-w-0">
        <p className="font-bold">{q.prompt || 'No question written'}</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {(q.options ?? []).map((o) => (
            <li
              key={o.label}
              className={cn(
                'rounded-lg px-2 py-1',
                o.correct ? 'bg-correct/10 font-bold text-correct' : 'bg-background',
              )}
            >
              {o.correct && <span aria-hidden="true">✓ </span>}
              {o.label}
              {o.correct && <span className="sr-only"> (right answer)</span>}
            </li>
          ))}
        </ul>
        {q.explanation && <p className="mt-2 text-sm text-content-muted">{q.explanation}</p>}
        <blockquote className="mt-2 rounded-lg bg-background p-2 text-[13px] text-content-muted">
          <span className="italic">“{draft.quote}”</span>{' '}
          {q.source_url && (
            <a
              href={q.source_url}
              target="_blank"
              rel="noreferrer"
              className="font-bold not-italic text-primary hover:underline"
            >
              {hostOf(q.source_url)}
            </a>
          )}
        </blockquote>
        {draft.problems.length > 0 && (
          <ul className="mt-2 grid gap-0.5 text-[13px] font-bold text-wrong">
            {draft.problems.map((p) => (
              <li key={p.message}>{p.message}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface-border pt-3 text-sm">
        {checks.map(([ok, label]) => (
          <p key={label} className="flex items-center gap-2">
            <span aria-hidden="true" className={ok ? 'text-correct' : 'text-wrong'}>
              {ok ? '✓' : '✕'}
            </span>
            <span className={ok ? 'text-content' : 'font-bold text-wrong'}>{label}</span>
            <span className="sr-only">{ok ? 'passed' : 'failed'}</span>
          </p>
        ))}
        {draft.decision === 'sent' ? (
          <Pill tone="ok">Sent to a quiz</Pill>
        ) : draft.decision === 'approved' ? (
          <div className="flex flex-wrap gap-2">
            <Pill tone="ok">Approved</Pill>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => decide('pending')}>
              Undo
            </Button>
          </div>
        ) : draft.decision === 'rejected' ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => decide('pending')}>
            Undo reject
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !draft.kept} onClick={() => decide('approved')}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => decide('rejected')}>
              Reject
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function SendPanel({
  run,
  approved,
  onSent,
}: {
  run: GeneratorRun;
  approved: GeneratorDraft[];
  onSent: (run: GeneratorRun) => void;
}): JSX.Element {
  const { client } = useStudio();
  const quizzes = useLoad(() => client.quizzes({ status: 'draft' }), []);
  const { busy, run: act } = useAction();
  const [quizId, setQuizId] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const id = useId();
  return (
    <Panel className="flex flex-wrap items-end gap-3">
      <Field label="Send approved drafts to" htmlFor={id} className="min-w-[240px] flex-1">
        <select
          id={id}
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          className={selectClass}
        >
          <option value="">Choose a draft quiz</option>
          {(quizzes.data ?? []).map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </Field>
      <Button
        disabled={busy || !quizId}
        onClick={() =>
          void act(
            () =>
              client.sendDrafts(
                run.id,
                quizId,
                approved.map((d) => d.id),
              ),
            `Sent ${approved.length} to the quiz. Check and publish it as usual.`,
          ).then((r) => {
            if (r) {
              onSent(r.run);
              setSentTo(quizId);
            }
          })
        }
      >
        Send {approved.length} approved
      </Button>
      {sentTo && (
        <Link to={`/admin/edit/${sentTo}`} className={linkButtonClass}>
          Open the quiz
        </Link>
      )}
    </Panel>
  );
}

function SidePanel({
  s,
  onOpen,
}: {
  s: GeneratorStatus;
  onOpen: (id: string) => void;
}): JSX.Element {
  const u = s.usage_30d;
  return (
    <div className="grid content-start gap-4">
      <Panel>
        <h2 className="font-bold">Usage · 30 days</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          {(
            [
              [u.runs, 'runs'],
              [u.drafts, 'drafts'],
              [u.sent, 'sent to quizzes'],
              [u.search_calls + u.page_calls, 'Bright Data calls'],
              [(u.input_tokens + u.output_tokens).toLocaleString(), 'Claude tokens'],
            ] as const
          ).map(([value, label]) => (
            <div key={label} className="rounded-xl bg-background p-2">
              <dd className="font-display text-lg font-extrabold">{value}</dd>
              <dt className="text-xs text-content-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel>
        <h2 className="font-bold">Recent runs</h2>
        {s.runs.length === 0 ? (
          <p className="mt-2 text-sm text-content-muted">No runs yet.</p>
        ) : (
          <ul className="mt-2 grid gap-1">
            {s.runs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="grid w-full gap-0.5 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-background"
                >
                  <span className="truncate font-semibold">{r.topic}</span>
                  <span className="text-xs text-content-muted">
                    {niceDateTime(r.created_at)} · {r.stage === 'failed' ? 'stopped' : r.stage} ·{' '}
                    {r.drafts} drafts
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
