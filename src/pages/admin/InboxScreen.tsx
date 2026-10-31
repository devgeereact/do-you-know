import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { FeedbackDetail, FeedbackStatus, FeedbackType } from '@/services/adminService';
import {
  FEEDBACK_STATUS,
  FEEDBACK_TYPES,
  cardClass,
  inputClass,
  maskEmail,
  niceDate,
  niceDateTime,
  selectClass,
  useAction,
  useLoad,
  useStudio,
} from '@/pages/admin/studio';
import {
  AHead,
  Dot,
  Empty,
  ErrorNote,
  Field,
  Filters,
  Loading,
  Pill,
  SegList,
} from '@/pages/admin/ui';

type StatusFilter = FeedbackStatus | 'all';

/** Messages from players and grown-ups: read, reply (grown-ups only), note and resolve. */
export function InboxScreen(): JSX.Element {
  const { client, refreshCounts, toast } = useStudio();
  const { busy, run } = useAction();
  const [status, setStatus] = useState<StatusFilter>('new');
  const [type, setType] = useState<FeedbackType | ''>('');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const all = useLoad(() => client.feedback({ type: type || undefined, limit: 200 }), [type]);
  const quizzes = useLoad(() => client.quizzes(), []);
  const items = all.data ?? [];
  const count = (s: StatusFilter): number =>
    items.filter((f) => s === 'all' || f.status === s).length;
  // The open message stays listed after a reply or status change moves it out of this filter.
  const list = items.filter((f) => status === 'all' || f.status === status || f.id === selected);
  const current = list.find((f) => f.id === selected) ?? list[0];

  useEffect(() => {
    if (!current) {
      setDetail(null);
      return;
    }
    let live = true;
    client
      .feedbackItem(current.id)
      .then((d) => live && setDetail(d))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [client, current]);

  useEffect(() => {
    setReply('');
    setNote('');
  }, [current?.id]);

  const refreshItem = async (id: string): Promise<void> => {
    const d = await client.feedbackItem(id);
    setDetail(d);
    if (all.data) {
      all.setData(all.data.map((f) => (f.id === id ? { ...f, status: d.status } : f)));
    }
    setSelected(id);
    refreshCounts();
  };

  const sendReply = async (): Promise<void> => {
    if (!detail) return;
    const res = await run(() => client.reply(detail.id, reply.trim()));
    if (!res) return;
    setReply('');
    await refreshItem(detail.id);
    toast(res.emailed ? 'Reply sent by email' : 'Saved; not emailed (email isn’t set up yet)');
  };

  const addNote = async (): Promise<void> => {
    if (!detail) return;
    const res = await run(() => client.note(detail.id, note.trim()), 'Note added');
    if (!res) return;
    setNote('');
    await refreshItem(detail.id);
  };

  const setItemStatus = async (s: FeedbackStatus): Promise<void> => {
    if (!detail) return;
    const res = await run(
      () => client.setFeedbackStatus(detail.id, s),
      s === 'resolved' ? 'Resolved' : s === 'open' ? 'Marked in review' : 'Marked new',
    );
    if (res) await refreshItem(detail.id);
  };

  const who = (f: { kind: string }, email?: string | null): string =>
    f.kind === 'adult' ? `Grown-up${email ? ` · ${maskEmail(email)}` : ''}` : 'Player';
  const quizId = detail?.quiz
    ? quizzes.data?.find((q) => q.slug === detail.quiz?.slug)?.id
    : undefined;

  return (
    <>
      <AHead
        title="Inbox"
        lead={`${count('new')} new · ${count('open')} in review · messages from players and grown-ups`}
      />
      <Filters>
        <SegList<StatusFilter>
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setSelected(null);
          }}
          options={(['new', 'open', 'resolved', 'all'] as const).map((s) => ({
            value: s,
            label: s === 'all' ? 'All' : FEEDBACK_STATUS[s].label,
            count: count(s),
          }))}
        />
        <label htmlFor="ib-type" className="sr-only">
          Type
        </label>
        <select
          id="ib-type"
          className={`${selectClass} h-9 w-auto`}
          value={type}
          onChange={(e) => setType(e.target.value as FeedbackType | '')}
        >
          <option value="">All types</option>
          {(Object.keys(FEEDBACK_TYPES) as FeedbackType[]).map((t) => (
            <option key={t} value={t}>
              {FEEDBACK_TYPES[t]}
            </option>
          ))}
        </select>
      </Filters>
      {all.error ? (
        <ErrorNote message={all.error} onRetry={all.reload} />
      ) : !all.data ? (
        <Loading />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div
            className={cn(
              cardClass,
              'grid max-h-[320px] gap-1 overflow-auto p-1.5 lg:max-h-[calc(100dvh-220px)]',
            )}
          >
            {list.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-current={f.id === current?.id}
                onClick={() => setSelected(f.id)}
                className={cn(
                  'grid grid-cols-[12px_minmax(0,1fr)] items-start gap-2.5 rounded-xl border-[1.5px] p-2.5 text-left',
                  f.id === current?.id
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-transparent hover:bg-content/[0.04]',
                )}
              >
                <span className="mt-1.5">
                  <Dot
                    tone={f.status === 'new' ? 'bad' : f.status === 'open' ? 'wait' : 'ok'}
                    label={FEEDBACK_STATUS[f.status].label}
                  />
                </span>
                <span className="min-w-0">
                  <span className="flex justify-between gap-2">
                    <b className="truncate text-sm">{who(f)}</b>
                    <span className="whitespace-nowrap text-xs text-content-muted">
                      {niceDate(f.created_at)}
                    </span>
                  </span>
                  <span className="block text-xs text-content-muted">
                    {FEEDBACK_TYPES[f.type]}
                    {f.quiz ? ` · ${f.quiz.title}` : ''}
                  </span>
                  <span className="line-clamp-2 text-sm">
                    {f.message || f.presets.join(' · ') || '(no message)'}
                  </span>
                </span>
              </button>
            ))}
            {list.length === 0 && <Empty>No messages.</Empty>}
          </div>
          <section className={cn(cardClass, 'min-w-0 p-4 lg:p-5')}>
            {!current ? (
              <Empty>Nothing here. Pick another filter.</Empty>
            ) : !detail || detail.id !== current.id ? (
              <Loading />
            ) : (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap gap-1.5">
                    <Pill tone="grape">{FEEDBACK_TYPES[detail.type]}</Pill>
                    <Pill tone={FEEDBACK_STATUS[detail.status].tone}>
                      {FEEDBACK_STATUS[detail.status].label}
                    </Pill>
                  </span>
                  <span className="text-sm text-content-muted">
                    {niceDateTime(detail.created_at)}
                  </span>
                </div>
                <h2 className="font-display text-[22px] font-extrabold [overflow-wrap:anywhere]">
                  {who(detail, detail.email)}
                </h2>
                {detail.message && (
                  <blockquote className="rounded-lg border-l-4 border-primary bg-content/[0.04] px-3 py-2 text-sm [overflow-wrap:anywhere]">
                    {detail.message}
                  </blockquote>
                )}
                {detail.presets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.presets.map((p) => (
                      <Pill key={p} tone="mute">
                        {p}
                      </Pill>
                    ))}
                  </div>
                )}
                {detail.quiz && (
                  <div className="grid gap-1 rounded-[14px] bg-content/[0.04] p-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-content-muted">
                      About
                    </span>
                    <b>{detail.quiz.title}</b>
                    {detail.question_prompt && (
                      <span className="text-sm">“{detail.question_prompt}”</span>
                    )}
                    {quizId && (
                      <Link
                        to={`/admin/edit/${quizId}${detail.question_id ? `?q=${detail.question_id}` : ''}`}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        Open in editor
                      </Link>
                    )}
                  </div>
                )}
                {detail.thread.length > 0 && (
                  <div className="grid gap-2">
                    {detail.thread.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          'rounded-[14px] px-3 py-2.5',
                          m.kind === 'reply' ? 'bg-correct/10' : 'bg-warning/15',
                        )}
                      >
                        <span className="text-xs text-content-muted">
                          {m.kind === 'reply'
                            ? m.emailed
                              ? 'Reply sent by email'
                              : 'Reply saved, not emailed'
                            : 'Internal note'}
                          {m.author ? ` · ${m.author}` : ''} · {niceDateTime(m.created_at)}
                        </span>
                        <p className="mt-0.5 whitespace-pre-wrap text-[14.5px] [overflow-wrap:anywhere]">
                          {m.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {detail.kind === 'adult' && detail.has_email ? (
                  <Field label={`Reply to ${maskEmail(detail.email)}`} htmlFor="ib-reply">
                    <textarea
                      id="ib-reply"
                      rows={3}
                      maxLength={5000}
                      className={inputClass}
                      placeholder="Write a reply. It goes by email (when email is set up) and is saved here."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        disabled={busy || !reply.trim()}
                        onClick={() => void sendReply()}
                      >
                        Send reply
                      </Button>
                    </div>
                  </Field>
                ) : (
                  <p className="text-sm text-content-muted">
                    {detail.kind === 'player'
                      ? 'Players can’t receive replies: we never store a way to contact children. Add a note for the team instead.'
                      : 'No email was left, so there is no way to reply. Add a note instead.'}
                  </p>
                )}
                <Field label="Internal note" htmlFor="ib-note">
                  <textarea
                    id="ib-note"
                    rows={2}
                    maxLength={5000}
                    className={inputClass}
                    placeholder="Only Studio users see this"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy || !note.trim()}
                      onClick={() => void addNote()}
                    >
                      Add note
                    </Button>
                  </div>
                </Field>
                <div className="flex flex-wrap justify-end gap-2 border-t border-surface-border pt-3">
                  {detail.status !== 'open' && detail.status !== 'resolved' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void setItemStatus('open')}
                    >
                      Mark in review
                    </Button>
                  )}
                  {detail.status !== 'resolved' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      className="!bg-correct !text-correct-fg !shadow-[0_4px_0_0_#0A5A3A]"
                      onClick={() => void setItemStatus('resolved')}
                    >
                      Resolve
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void setItemStatus('open')}
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
