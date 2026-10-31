import {
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
} from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { TONES, cardClass, type Tone } from '@/pages/admin/studio';

/** Small building blocks shared by the DYK Studio screens. */

export function Pill({
  tone = 'mute',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-extrabold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone, label }: { tone: 'bad' | 'wait' | 'ok'; label?: string }): JSX.Element {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
        tone === 'bad' ? 'bg-wrong' : tone === 'wait' ? 'bg-[#E8B500]' : 'bg-correct',
      )}
    />
  );
}

/** Screen heading with a short lead and actions on the right. */
export function AHead({
  title,
  lead,
  actions,
  above,
  below,
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  above?: ReactNode;
  below?: ReactNode;
}): JSX.Element {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {above}
        <h1 className="font-display text-[28px] font-extrabold leading-tight text-content [overflow-wrap:anywhere]">
          {title}
        </h1>
        {lead && <p className="text-sm font-semibold text-content-muted">{lead}</p>}
        {below}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  as: Tag = 'section',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'aside' | 'form' }): JSX.Element {
  return <Tag className={cn(cardClass, 'p-4 lg:p-5', className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  errors,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  errors?: string[];
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-bold text-content">
            {label}
          </label>
        ) : (
          <span className="text-sm font-bold text-content">{label}</span>
        )}
        {hint && <span className="text-xs font-semibold text-content-muted">{hint}</span>}
      </div>
      {children}
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-[13px] font-bold text-wrong">
          {e}
        </p>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }): JSX.Element {
  return <p className="px-4 py-8 text-center font-semibold text-content-muted">{children}</p>;
}

export function Loading(): JSX.Element {
  return (
    <p role="status" className="px-4 py-8 text-center font-semibold text-content-muted">
      Loading…
    </p>
  );
}

export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-wrong/30 bg-wrong/10 p-4"
    >
      <p className="font-bold text-content">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Pill tabs with optional counts (status filters). */
export function SegList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-content/[0.06] p-[3px]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40',
            o.value === value
              ? 'bg-surface text-content shadow-soft'
              : 'text-content-muted hover:text-content',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1 font-semibold text-content-muted">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Sticky filter bar above a list. */
export function Filters({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="sticky top-0 z-20 -mx-1 mb-3 flex flex-wrap items-center gap-2 bg-background px-1 py-2">
      {children}
    </div>
  );
}

// ---- Tables that become stacked cards under 720px ----

export function Table({
  head,
  children,
  className,
  label,
}: {
  head: { label: string; num?: boolean }[];
  children: ReactNode;
  className?: string;
  label?: string;
}): JSX.Element {
  return (
    <div className={cn(cardClass, 'overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table aria-label={label} className="w-full border-collapse text-sm max-[719px]:block">
          <thead className="max-[719px]:hidden">
            <tr>
              {head.map((h, i) => (
                <th
                  key={`${h.label}-${i}`}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap border-b border-surface-border bg-content/[0.025] px-3 py-2 text-left text-[11.5px] font-extrabold uppercase tracking-wider text-content-muted',
                    h.num && 'text-right',
                  )}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="max-[719px]:block">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>): JSX.Element {
  return (
    <tr
      className={cn(
        'border-b border-surface-border/70 last:border-b-0 hover:bg-content/[0.02] max-[719px]:block max-[719px]:px-3 max-[719px]:py-2.5',
        className,
      )}
      {...props}
    />
  );
}

/**
 * A cell. `label` shows as the row heading on phones; `lead` is the card title there; `num`
 * right-aligns figures.
 */
export function Td({
  label,
  lead,
  num,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & {
  label: string;
  lead?: boolean;
  num?: boolean;
}): JSX.Element {
  return (
    <td
      data-l={label}
      className={cn(
        'h-11 px-3 py-2 align-middle',
        num && 'text-right tabular-nums',
        lead
          ? 'max-[719px]:block max-[719px]:h-auto max-[719px]:px-0 max-[719px]:pb-1.5 max-[719px]:pt-0 max-[719px]:text-[15px]'
          : 'max-[719px]:flex max-[719px]:h-auto max-[719px]:items-center max-[719px]:justify-between max-[719px]:gap-3 max-[719px]:px-0 max-[719px]:py-[3px] max-[719px]:text-right max-[719px]:before:shrink-0 max-[719px]:before:text-left max-[719px]:before:text-xs max-[719px]:before:font-extrabold max-[719px]:before:text-content-muted max-[719px]:before:content-[attr(data-l)]',
        className,
      )}
      {...props}
    />
  );
}

// ---- Dialogs ----

/** A centred dialog with a focus trap-lite: focus moves in on open and Escape closes. */
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}): JSX.Element {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>(
      'input, select, textarea, button[data-autofocus]',
    );
    (first ?? box.current)?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && box.current) {
        const items = [
          ...box.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
          ),
        ];
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (!firstItem || !lastItem) return;
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#17153A]/50 p-4">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className={cn(
          cardClass,
          'max-h-[calc(100dvh-2rem)] w-full overflow-y-auto p-5 shadow-float focus:outline-none',
          wide ? 'max-w-lg' : 'max-w-md',
        )}
      >
        <h2 id={id} className="font-display text-xl font-extrabold text-content">
          {title}
        </h2>
        <div className="mt-2">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  tone = 'primary',
  onAnswer,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onAnswer: (ok: boolean) => void;
}): JSX.Element {
  return (
    <Modal
      title={title}
      onClose={() => onAnswer(false)}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onAnswer(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            data-autofocus
            onClick={() => onAnswer(true)}
            className={
              tone === 'danger'
                ? '!bg-wrong !text-wrong-fg !shadow-[0_4px_0_0_#8F1F1D] hover:!bg-wrong/95'
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body && <p className="text-[15px] text-content-muted">{body}</p>}
    </Modal>
  );
}

export function Toasts({
  items,
}: {
  items: { id: number; message: string; tone: 'ok' | 'bad' }[];
}): JSX.Element {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => (
        <p
          key={t.id}
          role={t.tone === 'bad' ? 'alert' : 'status'}
          className={cn(
            'max-w-md animate-fade-up rounded-full px-5 py-2.5 text-center text-sm font-bold shadow-float',
            t.tone === 'bad' ? 'bg-wrong text-wrong-fg' : 'bg-[#17153A] text-white',
          )}
        >
          {t.message}
        </p>
      ))}
    </div>
  );
}

export function Kpi({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}): JSX.Element {
  return (
    <div className={cn(cardClass, 'px-3.5 py-3')}>
      <p className="text-xs font-extrabold text-content-muted">{label}</p>
      <p className="font-display text-[26px] font-extrabold leading-tight tabular-nums text-content">
        {value}
      </p>
      <p className="text-xs font-bold text-content-muted">{note}</p>
    </div>
  );
}

export function Bar({ percent, tone }: { percent: number; tone: 'ok' | 'bad' }): JSX.Element {
  return (
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-content/[0.08]">
      <div
        className={cn('h-full rounded-full', tone === 'bad' ? 'bg-wrong' : 'bg-correct')}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}
