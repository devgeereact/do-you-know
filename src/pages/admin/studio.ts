import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  AdminClient,
  FeedbackStatus,
  FeedbackType,
  QuizListItem,
  Subject,
} from '@/services/adminService';
import { adminErrorMessage } from '@/services/adminService';

/** Shared state and helpers for every DYK Studio screen. */

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel: string;
  /** "danger" for retire, hide, discard and other things players notice. */
  tone?: 'primary' | 'danger';
}

export interface Counts {
  todo: number;
  inbox: number;
  check: number;
}

export interface StudioContextValue {
  client: AdminClient;
  subjects: Subject[];
  refreshSubjects: () => Promise<void>;
  counts: Counts;
  refreshCounts: () => void;
  toast: (message: string, tone?: 'ok' | 'bad') => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error('useStudio outside StudioContext');
  return value;
}

/**
 * Loads data for a screen: `{data, error, loading, reload}`. Errors become friendly text. The
 * loader runs again whenever one of `deps` changes; stale replies are dropped.
 */
export function useLoad<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
): {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (value: T) => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  useEffect(() => {
    let live = true;
    setLoading(true);
    loaderRef
      .current()
      .then((value) => {
        if (!live) return;
        setData(value);
        setError(null);
      })
      .catch((err: unknown) => live && setError(adminErrorMessage(err)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller lists the inputs
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}

/** Runs a Studio action with a busy flag; errors become a toast and resolve to null. */
export function useAction(): {
  busy: boolean;
  run: <T>(action: () => Promise<T>, success?: string) => Promise<T | null>;
} {
  const { toast } = useStudio();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T>(action: () => Promise<T>, success?: string): Promise<T | null> => {
      setBusy(true);
      try {
        const result = await action();
        if (success) toast(success);
        return result;
      } catch (err) {
        toast(adminErrorMessage(err), 'bad');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}

// ---- Shared class strings ----

export const inputClass =
  'block w-full min-w-0 rounded-xl border-2 border-surface-border bg-surface px-3 py-2 text-[15px] text-content placeholder:text-content-muted/70 focus:border-primary focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 disabled:opacity-60';
export const selectClass = `${inputClass} h-10 py-0 pr-8`;
export const labelClass = 'mb-1 block text-sm font-bold text-content';
export const linkButtonClass =
  'inline-flex items-center gap-1 rounded-md text-sm font-bold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:opacity-50';
export const cardClass = 'rounded-2xl border border-surface-border bg-surface shadow-soft';

// ---- Labels ----

export const FEEDBACK_TYPES: Record<FeedbackType, string> = {
  feedback: 'Feedback',
  question: 'Question report',
  idea: 'Idea',
  problem: 'Problem',
};

export const FEEDBACK_STATUS: Record<FeedbackStatus, { label: string; tone: Tone }> = {
  new: { label: 'New', tone: 'bad' },
  open: { label: 'In review', tone: 'warn' },
  resolved: { label: 'Resolved', tone: 'ok' },
};

export type Tone = 'grape' | 'ok' | 'bad' | 'warn' | 'mute' | 'lemon' | 'ink' | 'lagoon';

export const TONES: Record<Tone, string> = {
  grape: 'bg-primary/10 text-primary',
  ok: 'bg-correct/10 text-correct',
  bad: 'bg-wrong/10 text-wrong',
  warn: 'bg-warning/20 text-content',
  mute: 'bg-content/[0.06] text-content-muted',
  lemon: 'bg-secondary text-secondary-fg',
  ink: 'bg-content text-background',
  lagoon: 'bg-sky/15 text-content',
};

/** Where a quiz stands, from the list or detail fields. */
export function quizState(q: {
  status: QuizListItem['status'];
  in_review: boolean;
  has_draft: boolean;
  publish_at: string | null;
}): { label: string; tone: Tone }[] {
  const out: { label: string; tone: Tone }[] = [];
  if (q.status === 'retired') return [{ label: 'Retired', tone: 'bad' }];
  if (q.status === 'published') {
    out.push({ label: 'Live', tone: 'ok' });
    if (q.publish_at && new Date(q.publish_at).getTime() > Date.now()) {
      out.push({ label: `From ${niceDate(q.publish_at.slice(0, 10))}`, tone: 'grape' });
    }
    if (q.in_review) out.push({ label: 'Edits to check', tone: 'warn' });
    else if (q.has_draft) out.push({ label: 'Unpublished edits', tone: 'warn' });
    return out;
  }
  return [q.in_review ? { label: 'To check', tone: 'warn' } : { label: 'Draft', tone: 'mute' }];
}

// ---- Formatting ----

/** "31 Oct" (or "31 Oct 2025" outside this year) for a date or ISO time. */
export function niceDate(value: string | null | undefined): string {
  if (!value) return '–';
  const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return '–';
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'Europe/London',
  });
}

export function niceDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '–';
  return `${niceDate(value)} ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  })}`;
}

export function weekdayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtMs(ms: number): string {
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
}

/** g•••@example.com */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return 'no email';
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 1)}•••@${domain}`;
}

export function hostOf(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
