import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { londonToday, markedAnswer, validateQuestion } from '@/lib/adminValidation';
import { cn } from '@/lib/utils';
import type { QuizDetail } from '@/services/adminService';
import { QuestionPreview } from '@/pages/admin/QuestionPreview';
import { hostOf, inputClass, niceDate, useAction, useLoad, useStudio } from '@/pages/admin/studio';
import { AHead, Bar, Empty, ErrorNote, Field, Loading, Panel, Pill } from '@/pages/admin/ui';

/** One question at a time with its source; nothing goes live until every one is ticked. */
export function CheckScreen(): JSX.Element {
  const { client, refreshCounts, confirm } = useStudio();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { busy, run } = useAction();
  const today = londonToday();
  const list = useLoad(async () => {
    const [review, live] = await Promise.all([
      client.quizzes({ status: 'review' }),
      client.quizzes({ status: 'published' }),
    ]);
    // A live quiz's edits waiting for checks only show in_review on its detail (the list's
    // review flag misses them on MariaDB), so confirm those candidates one by one.
    const seen = new Set(review.map((q) => q.id));
    const candidates = live.filter((q) => q.has_draft && !seen.has(q.id));
    const details = await Promise.all(candidates.map((q) => client.quiz(q.id)));
    const edits = candidates.filter((_, i) => details[i]?.quiz.in_review);
    return [...review, ...edits.map((q) => ({ ...q, in_review: true }))];
  }, []);
  const items = list.data ?? [];
  const wanted = params.get('quiz');
  const current = items.find((q) => q.id === wanted) ?? items[0];
  const [detail, setDetail] = useState<QuizDetail | null>(null);
  const [index, setIndex] = useState(0);
  const [publishAt, setPublishAt] = useState(today);

  useEffect(() => {
    if (!current) {
      setDetail(null);
      return;
    }
    let live = true;
    setDetail(null);
    client
      .quiz(current.id)
      .then((d) => {
        if (!live) return;
        setDetail(d);
        const first = d.questions.findIndex((q) => !q.checked);
        setIndex(first >= 0 ? first : 0);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [client, current]);

  if (list.loading && !list.data) return <Loading />;
  if (list.error) return <ErrorNote message={list.error} onRetry={list.reload} />;
  if (!current) {
    return (
      <>
        <AHead
          title="Check & publish"
          lead="Nothing waiting. Quizzes appear here when you send them to check."
        />
        <Panel>
          <Empty>All checked.</Empty>
        </Panel>
      </>
    );
  }

  const q = detail?.questions[index];
  const done = detail ? detail.questions.filter((x) => x.checked).length : 0;
  const total = detail?.questions.length ?? 0;
  const all = total > 0 && done === total;
  const errors = q ? validateQuestion(q, { today }) : [];
  const problems = detail?.problems ?? [];
  const canPublish = all && problems.length === 0 && publishAt >= today;
  const later = publishAt > today;

  const mark = async (checked: boolean): Promise<void> => {
    if (!detail || !q) return;
    const next = await run(() => client.check(detail.quiz.id, index, checked));
    if (!next) return;
    setDetail(next);
    refreshCounts();
    if (checked) {
      const after = next.questions.findIndex((x, i) => i > index && !x.checked);
      const any = next.questions.findIndex((x) => !x.checked);
      setIndex(after >= 0 ? after : any >= 0 ? any : index);
    }
  };

  const publish = async (): Promise<void> => {
    if (!detail) return;
    const nextVersion = (detail.quiz.version ?? 0) + 1;
    const ok = await confirm({
      title: later ? `Schedule for ${niceDate(publishAt)}?` : 'Publish now?',
      body: `${detail.quiz.title ?? 'This quiz'} goes live${later ? ` at midnight on ${niceDate(publishAt)}` : ' straight away'}${detail.quiz.version ? ` as version ${nextVersion}` : ''}. Players will see it.`,
      confirmLabel: later ? 'Schedule' : 'Publish now',
    });
    if (!ok) return;
    const result = await run(
      () => client.publish(detail.quiz.id, later ? publishAt : null),
      later ? 'Scheduled' : 'Published',
    );
    if (result) {
      refreshCounts();
      setParams({}, { replace: true });
      list.reload();
    }
  };

  return (
    <>
      <AHead
        title="Check & publish"
        lead="Go through each question with its source. Nothing goes live until every one is ticked."
      />
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {items.map((z) => (
          <button
            key={z.id}
            type="button"
            aria-pressed={z.id === current.id}
            onClick={() => setParams({ quiz: z.id }, { replace: true })}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 px-3 text-sm font-bold',
              z.id === current.id
                ? 'border-primary bg-primary/10'
                : 'border-surface-border bg-surface hover:border-primary/40',
            )}
          >
            {z.title}
            <Pill tone="warn">{z.question_count}</Pill>
          </button>
        ))}
      </div>
      {!detail || !q ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Panel className="grid min-w-0 content-start gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="[overflow-wrap:anywhere]">
                {detail.quiz.title} · question {index + 1} of {total}
              </b>
              <Pill tone={q.checked ? 'ok' : 'warn'}>{q.checked ? 'Checked' : 'Not checked'}</Pill>
            </div>
            <div className="flex items-center gap-2">
              <Bar percent={total ? (100 * done) / total : 0} tone="ok" />
              <span className="text-xs font-bold text-content-muted">
                {done}/{total}
              </span>
            </div>
            <QuestionPreview question={q} fallbackWorld={q.scene_default} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                ‹ Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  if (q.checked) await mark(false);
                  navigate(`/admin/edit/${detail.quiz.id}?q=${q.id}`);
                }}
              >
                Needs a fix
              </Button>
              <Button
                size="sm"
                disabled={busy || errors.length > 0 || q.checked}
                title={errors.length ? 'Fix the problems shown first' : undefined}
                className="!bg-correct !text-correct-fg !shadow-[0_4px_0_0_#0A5A3A]"
                onClick={() => void mark(true)}
              >
                ✓ Looks right
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={index >= total - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next ›
              </Button>
            </div>
          </Panel>
          <aside className="grid min-w-0 content-start gap-4">
            <Panel className="grid gap-3">
              <div>
                <p className="text-sm font-bold text-content-muted">Marked answer</p>
                <p className="font-extrabold [overflow-wrap:anywhere]">{markedAnswer(q)}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-content-muted">Explanation</p>
                <p className="text-sm">
                  {q.explanation || <span className="font-bold text-wrong">Missing</span>}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-content-muted">Source</p>
                <div className="rounded-[14px] bg-content/[0.05] p-3 text-sm [overflow-wrap:anywhere]">
                  {q.source_url ? (
                    <>
                      <a
                        href={q.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-primary underline-offset-2 hover:underline"
                      >
                        {hostOf(q.source_url) || q.source_url} ↗
                      </a>
                      <p className="text-xs text-content-muted">{q.source_url}</p>
                    </>
                  ) : (
                    <span className="font-bold text-wrong">
                      No source. Add one before publishing.
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-content-muted">Re-check by</p>
                <p className="text-sm">{niceDate(q.review_by)}</p>
              </div>
              {errors.map((e) => (
                <p key={e.message} className="text-[13px] font-bold text-wrong">
                  ✕ {e.message}
                </p>
              ))}
              <Link
                to={`/admin/edit/${detail.quiz.id}?q=${q.id}`}
                className="text-sm font-bold text-primary hover:underline"
              >
                Open in editor
              </Link>
            </Panel>
            <Panel className={cn('grid gap-3', !canPublish && 'opacity-90')}>
              <h2 className="font-display text-xl font-extrabold">Publish</h2>
              {problems.length > 0 ? (
                <p className="text-[13px] font-bold text-wrong">
                  {typeof problems[0]?.index === 'number'
                    ? `Question ${(problems[0].index ?? 0) + 1}: `
                    : ''}
                  {problems[0]?.message}
                </p>
              ) : all ? (
                <p className="text-sm">Every question is checked.</p>
              ) : (
                <p className="text-sm">
                  {total - done} question{total - done === 1 ? '' : 's'} still to check.
                </p>
              )}
              <Field label="Go live on" htmlFor="pub-date">
                <input
                  id="pub-date"
                  type="date"
                  min={today}
                  className={inputClass}
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value || today)}
                />
              </Field>
              <Button disabled={busy || !canPublish} onClick={() => void publish()}>
                {later ? `Schedule for ${niceDate(publishAt)}` : 'Publish now'}
                {detail.quiz.version ? ` as v${detail.quiz.version + 1}` : ''}
              </Button>
            </Panel>
          </aside>
        </div>
      )}
    </>
  );
}
