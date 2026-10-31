import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { LogoMark } from '@/components/brand/Logo';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { adminClient, getAdminMe, type GetToken, type Subject } from '@/services/adminService';
import {
  StudioContext,
  type ConfirmOptions,
  type Counts,
  type StudioContextValue,
} from '@/pages/admin/studio';
import { CommandPalette } from '@/pages/admin/CommandPalette';
import { ConfirmDialog, Loading, Toasts } from '@/pages/admin/ui';

const TodoScreen = lazy(() => import('./TodoScreen').then((m) => ({ default: m.TodoScreen })));
const InboxScreen = lazy(() => import('./InboxScreen').then((m) => ({ default: m.InboxScreen })));
const LibraryScreen = lazy(() =>
  import('./LibraryScreen').then((m) => ({ default: m.LibraryScreen })),
);
const EditorScreen = lazy(() =>
  import('./EditorScreen').then((m) => ({ default: m.EditorScreen })),
);
const CheckScreen = lazy(() => import('./CheckScreen').then((m) => ({ default: m.CheckScreen })));
const ImportScreen = lazy(() =>
  import('./ImportScreen').then((m) => ({ default: m.ImportScreen })),
);
const GeneratorScreen = lazy(() =>
  import('./GeneratorScreen').then((m) => ({ default: m.GeneratorScreen })),
);
const CalendarScreen = lazy(() =>
  import('./CalendarScreen').then((m) => ({ default: m.CalendarScreen })),
);
const PlayersScreen = lazy(() =>
  import('./PlayersScreen').then((m) => ({ default: m.PlayersScreen })),
);
const SubjectsScreen = lazy(() =>
  import('./SubjectsScreen').then((m) => ({ default: m.SubjectsScreen })),
);
const ActivityScreen = lazy(() =>
  import('./ActivityScreen').then((m) => ({ default: m.ActivityScreen })),
);

type Access = 'checking' | 'allowed' | 'forbidden' | 'error';

/**
 * DYK Studio: the signed-in staff CMS. Shows nothing but a refusal unless the server says this
 * account is an admin (GET /admin/me); every later call is checked again on the server.
 */
export function AdminConsole({
  getToken,
  account,
}: {
  getToken: GetToken;
  account: ReactNode;
}): JSX.Element {
  const [access, setAccess] = useState<Access>('checking');
  // Callers pass a fresh function each render; the check must run once per mount.
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;
  const stableToken = useCallback<GetToken>(() => tokenRef.current(), []);

  useEffect(() => {
    let active = true;
    getAdminMe(stableToken)
      .then(() => active && setAccess('allowed'))
      .catch((err: unknown) => {
        if (!active) return;
        setAccess(
          err instanceof ApiError && (err.status === 403 || err.status === 401)
            ? 'forbidden'
            : 'error',
        );
      });
    return () => {
      active = false;
    };
  }, [stableToken]);

  if (access === 'checking') return <p role="status">Checking access…</p>;
  if (access !== 'allowed') {
    return (
      <Card className="space-y-4">
        <h1 className="font-display text-2xl font-extrabold">
          {access === 'forbidden'
            ? 'This account can’t use the Studio'
            : 'The Studio could not load'}
        </h1>
        <p className="text-content-muted">
          {access === 'forbidden'
            ? 'DYK Studio is for the site’s staff. Sign in with a staff account, or go back to the games.'
            : 'Try again in a moment.'}
        </p>
        {account}
      </Card>
    );
  }
  return <Studio getToken={stableToken} account={account} />;
}

const GROUPS = ['Work', 'Content', 'Site'] as const;

const NAV: {
  to: string;
  label: string;
  icon: IconName;
  group: (typeof GROUPS)[number];
  count?: keyof Counts;
}[] = [
  { to: '/admin', label: 'To do', icon: 'todo', count: 'todo', group: 'Work' },
  { to: '/admin/inbox', label: 'Inbox', icon: 'mail', count: 'inbox', group: 'Work' },
  { to: '/admin/library', label: 'Library', icon: 'book', group: 'Content' },
  { to: '/admin/check', label: 'Check & publish', icon: 'check', count: 'check', group: 'Content' },
  { to: '/admin/import', label: 'Import', icon: 'up', group: 'Content' },
  { to: '/admin/generator', label: 'Generator', icon: 'spark', group: 'Content' },
  { to: '/admin/subjects', label: 'Subjects', icon: 'tag', group: 'Content' },
  { to: '/admin/calendar', label: 'Daily calendar', icon: 'cal', group: 'Site' },
  { to: '/admin/players', label: 'Players', icon: 'users', group: 'Site' },
  { to: '/admin/activity', label: 'Activity', icon: 'log', group: 'Site' },
];

function Studio({ getToken, account }: { getToken: GetToken; account: ReactNode }): JSX.Element {
  const client = useMemo(() => adminClient(getToken), [getToken]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [counts, setCounts] = useState<Counts>({ todo: 0, inbox: 0, check: 0 });
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: 'ok' | 'bad' }[]>([]);
  const [ask, setAsk] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(
    null,
  );
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const [palette, setPalette] = useState(false);
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(window.location.host);
  const current =
    (pathname.startsWith('/admin/edit')
      ? 'Editor'
      : NAV.find((n) =>
          n.to === '/admin'
            ? pathname === '/admin' || pathname === '/admin/'
            : pathname.startsWith(n.to),
        )?.label) ?? 'To do';

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const refreshSubjects = useCallback(async () => {
    setSubjects(await client.subjects());
  }, [client]);

  const refreshCounts = useCallback(() => {
    Promise.all([client.todo(), client.quizzes({ status: 'review' })])
      .then(([todo, review]) => {
        const by = (key: string): number => todo.find((t) => t.key === key)?.count ?? 0;
        setCounts({
          todo: todo.filter((t) => t.key !== 'daily_gaps').reduce((s, t) => s + t.count, 0),
          inbox: by('feedback_new'),
          check: review.length,
        });
      })
      .catch(() => undefined);
  }, [client]);

  useEffect(() => {
    refreshSubjects().catch(() => undefined);
  }, [refreshSubjects]);
  useEffect(() => {
    refreshCounts();
    if (main.current) main.current.scrollTop = 0;
    // On phones the nav is a scrolling strip: keep the current screen's link in view.
    document
      .querySelector('nav[aria-label="Studio"] [aria-current="page"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [refreshCounts, pathname]);

  const toast = useCallback((message: string, tone: 'ok' | 'bad' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setAsk({ ...options, resolve })),
    [],
  );

  const value = useMemo<StudioContextValue>(
    () => ({ client, subjects, refreshSubjects, counts, refreshCounts, toast, confirm }),
    [client, subjects, refreshSubjects, counts, refreshCounts, toast, confirm],
  );

  return (
    <StudioContext.Provider value={value}>
      {/* The Studio covers the site chrome: it is its own app with its own scroll. It lives in
          a portal on <body> because the site's page transitions transform their wrapper, which
          would trap a fixed layer inside it. */}
      {createPortal(
        <div
          data-lenis-prevent
          className="fixed inset-0 z-[60] flex flex-col bg-background text-content lg:flex-row"
        >
          <nav
            aria-label="Studio"
            className="flex flex-none gap-1 overflow-x-auto border-b border-surface-border bg-surface p-3 lg:w-[248px] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3.5 lg:py-[18px]"
          >
            <div className="hidden items-center gap-2.5 px-2 pb-4 pt-1 lg:flex">
              <LogoMark size={34} />
              <span className="leading-tight">
                <span className="block font-display text-[17px] font-extrabold text-content">
                  Do You Know?
                </span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-content-muted">
                  Studio
                </span>
              </span>
            </div>
            {GROUPS.map((group) => (
              <div key={group} className="contents">
                <p className="hidden px-2.5 pb-1.5 pt-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-content-muted/80 lg:block">
                  {group}
                </p>
                {NAV.filter((item) => item.group === group).map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      cn(
                        'flex h-[38px] flex-none items-center gap-2.5 whitespace-nowrap rounded-[10px] px-2.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40',
                        isActive ||
                          (item.to === '/admin/library' && pathname.startsWith('/admin/edit'))
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'font-medium text-content-muted hover:bg-background hover:text-content',
                      )
                    }
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                    {item.count && counts[item.count] > 0 && (
                      <span
                        className={cn(
                          'ml-auto rounded-full px-1.5 text-[11px] font-bold leading-[20px]',
                          item.count === 'check'
                            ? 'bg-background text-content-muted'
                            : 'bg-tang text-[#17153A]',
                        )}
                      >
                        <span className="sr-only">(</span>
                        {counts[item.count]}
                        <span className="sr-only">)</span>
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
            <div className="ml-2 flex flex-none items-center rounded-[14px] bg-background px-2.5 py-1 text-[13px] lg:mt-auto lg:ml-0 lg:block lg:p-2.5">
              <p className="hidden font-semibold text-content lg:block">Signed in</p>
              <p className="mb-1.5 hidden text-content-muted lg:block">Super Admin</p>
              <div className="[&_button]:!h-8 [&_button]:!text-xs">{account}</div>
            </div>
          </nav>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="hidden h-[60px] flex-none items-center gap-4 border-b border-surface-border bg-surface px-7 lg:flex">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-content-muted">
                Studio
                <span aria-hidden="true">›</span>
                <span className="font-semibold text-content">{current}</span>
              </p>
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="ml-6 flex h-[38px] w-full max-w-[420px] items-center gap-2.5 rounded-[11px] bg-background px-3 text-sm text-content-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                Search quizzes and screens
                <kbd className="ml-auto rounded-md border border-surface-border bg-surface px-1.5 text-[11px] font-semibold">
                  ⌘K
                </kbd>
              </button>
              <span
                className={cn(
                  'ml-auto inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold',
                  isLocal ? 'bg-warning/15 text-[#8a5300]' : 'bg-correct/10 text-correct',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('h-2 w-2 rounded-full', isLocal ? 'bg-warning' : 'bg-correct')}
                />
                {isLocal ? 'Local copy' : 'Live'} · {window.location.host}
              </span>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-2 py-1 text-[13px] font-semibold text-primary hover:bg-primary/10"
              >
                Open site
              </a>
            </header>
            <main
              ref={main}
              id="studio-main"
              className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F8F7FC] px-4 pb-16 pt-4 dark:bg-background lg:px-7 lg:pb-12 lg:pt-6"
            >
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route index element={<TodoScreen />} />
                  <Route path="inbox" element={<InboxScreen />} />
                  <Route path="library" element={<LibraryScreen />} />
                  <Route path="edit/:id" element={<EditorScreen />} />
                  <Route path="check" element={<CheckScreen />} />
                  <Route path="import" element={<ImportScreen />} />
                  <Route path="generator" element={<GeneratorScreen />} />
                  <Route path="calendar" element={<CalendarScreen />} />
                  <Route path="players" element={<PlayersScreen />} />
                  <Route path="subjects" element={<SubjectsScreen />} />
                  <Route path="activity" element={<ActivityScreen />} />
                  <Route path="*" element={<TodoScreen />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          <CommandPalette open={palette} onClose={() => setPalette(false)} screens={NAV} />
          <Toasts items={toasts} />
          {ask && (
            <ConfirmDialog
              title={ask.title}
              body={ask.body}
              confirmLabel={ask.confirmLabel}
              tone={ask.tone}
              onAnswer={(ok) => {
                ask.resolve(ok);
                setAsk(null);
              }}
            />
          )}
        </div>,
        document.body,
      )}
    </StudioContext.Provider>
  );
}

type IconName =
  'todo' | 'mail' | 'book' | 'check' | 'up' | 'spark' | 'cal' | 'users' | 'tag' | 'log';

const ICONS: Record<IconName, ReactNode> = {
  todo: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 12.5l2.6 2.6L16 9.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" />
      <path d="M5 17a3 3 0 013-3h11M9 8h6" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  up: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  spark: <path d="M12 3l2 6.5L20.5 12 14 14l-2 7-2-7-6.5-2L10 9.5z" />,
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0113 0M16 5.5a3.5 3.5 0 010 7M18 14.5a6 6 0 013.5 5.5" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.5V4.5a1 1 0 011-1h8l8 8-9 9z" />
      <circle cx="8.5" cy="8.5" r="1.6" />
    </>
  ),
  log: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
};

function Icon({ name }: { name: IconName }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {ICONS[name]}
    </svg>
  );
}
