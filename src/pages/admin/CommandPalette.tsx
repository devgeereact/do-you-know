import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { QuizListItem } from '@/services/adminService';
import { useStudio } from '@/pages/admin/studio';

export interface PaletteScreen {
  to: string;
  label: string;
}

type Item = { key: string; label: string; hint: string; to: string };

/**
 * ⌘K / Ctrl+K: jump to any Studio screen or open a quiz by title. Quiz search uses the same
 * server-side list as the Library (GET /admin/quizzes?q=), so it only ever shows what the
 * server says exists.
 */
export function CommandPalette({
  open,
  onClose,
  screens,
}: {
  open: boolean;
  onClose: () => void;
  screens: PaletteScreen[];
}): JSX.Element | null {
  const { client } = useStudio();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setQuizzes([]);
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      client
        .quizzes({ q })
        .then((items) => live && setQuizzes(items.slice(0, 6)))
        .catch(() => live && setQuizzes([]));
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [client, open, query]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const quizItems = quizzes.map((z) => ({
      key: `q-${z.id}`,
      label: z.title,
      hint: z.category?.name ?? 'Quiz',
      to: `/admin/edit/${z.id}`,
    }));
    const screenItems = screens
      .filter((s) => !q || s.label.toLowerCase().includes(q))
      .map((s) => ({ key: `s-${s.to}`, label: s.label, hint: 'Go to', to: s.to }));
    return [...quizItems, ...screenItems];
  }, [query, quizzes, screens]);

  useEffect(() => setActive(0), [items.length]);

  if (!open) return null;

  const go = (item: Item | undefined): void => {
    if (!item) return;
    onClose();
    navigate(item.to);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#17153A]/40 px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the Studio"
        className="relative w-full max-w-[600px] overflow-hidden rounded-2xl bg-surface shadow-[0_40px_100px_-20px_rgba(23,21,58,.5)] ring-1 ring-surface-border"
      >
        <div className="flex h-14 items-center gap-3 border-b border-surface-border px-4">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="text-content-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
            aria-label="Search quizzes and screens"
            placeholder="Search quizzes and screens"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(items[active]);
              }
            }}
            className="h-full flex-1 bg-transparent text-base text-content outline-none placeholder:text-content-muted"
          />
          <kbd className="rounded-md border border-surface-border px-1.5 text-[11px] font-semibold text-content-muted">
            esc
          </kbd>
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label="Results"
          className="max-h-[50vh] overflow-y-auto py-1.5"
        >
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-content-muted">
              Nothing matches that yet.
            </li>
          )}
          {items.map((item, i) => (
            <li
              key={item.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[14.5px]',
                i === active ? 'bg-primary/10 text-content' : 'text-content',
              )}
            >
              <span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span>
              <span className="shrink-0 text-xs text-content-muted">{item.hint}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-4 border-t border-surface-border bg-background px-4 py-2 text-xs text-content-muted">
          <span>↑ ↓ move</span>
          <span>↵ open</span>
          <span>⌘K anywhere</span>
        </div>
      </div>
    </div>
  );
}
