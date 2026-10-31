import { useEffect, useId, useRef, useState } from 'react';
import { sendFeedback } from '@/services/feedbackService';
import { t } from '@/i18n';

/**
 * "Report" on a question: a small dialog with ready-made reasons only (children never type),
 * sent with the quiz and question ids so the Studio inbox can open the exact question.
 */
export function ReportQuestion({
  quizSlug,
  questionId,
  prompt,
}: {
  quizSlug: string;
  questionId: string;
  prompt: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(t.play.report.reasons[0] ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLElement>('input:checked')?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function close(): void {
    setOpen(false);
    opener.current?.focus();
  }

  async function send(): Promise<void> {
    setState('sending');
    try {
      await sendFeedback({
        type: 'question',
        presets: [reason],
        quiz_slug: quizSlug,
        question_id: questionId,
      });
      setState('sent');
      setOpen(false);
    } catch {
      setState('failed');
    }
  }

  if (state === 'sent') {
    return (
      <p role="status" className="text-sm font-semibold text-content-muted">
        {t.play.report.sent}
      </p>
    );
  }

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-label={t.play.report.openLabel}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-tap items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-content-muted hover:bg-background hover:text-content focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        >
          <path d="M5 21V4h11l-1.5 4L16 12H5" />
        </svg>
        {t.play.report.open}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-[rgb(23_21_58/0.5)] p-4"
          onPointerDown={(e) => e.target === e.currentTarget && close()}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-3xl border-2 border-content bg-surface p-6 text-content shadow-[0_6px_0_rgb(var(--content))]"
          >
            <h2 id={titleId} className="text-2xl">
              {t.play.report.title}
            </h2>
            <p className="mt-1 text-content-muted">{t.play.report.lead}</p>
            <p className="mt-3 rounded-xl bg-background p-3 text-sm font-semibold">“{prompt}”</p>
            <fieldset className="mt-4 grid gap-2">
              <legend className="sr-only">{t.play.report.title}</legend>
              {t.play.report.reasons.map((r) => (
                <label
                  key={r}
                  className="flex min-h-tap cursor-pointer items-center gap-3 rounded-xl border-2 border-surface-border px-3 font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="h-5 w-5 accent-[rgb(var(--primary))]"
                  />
                  {r}
                </label>
              ))}
            </fieldset>
            {state === 'failed' && (
              <p role="alert" className="mt-3 text-sm font-semibold text-wrong">
                {t.play.report.failed}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="h-11 rounded-full border-2 border-surface-border px-5 font-bold"
              >
                {t.play.report.cancel}
              </button>
              <button
                type="button"
                disabled={state === 'sending'}
                onClick={() => void send()}
                className="h-11 rounded-full bg-primary px-5 font-bold text-primary-fg shadow-edge-primary disabled:opacity-50"
              >
                {t.play.report.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
