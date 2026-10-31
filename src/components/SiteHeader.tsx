import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Logo } from '@/components/brand/Logo';
import { NAV_ITEMS, isNavActive } from '@/components/navItems';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useSession } from '@/hooks/useSession';
import { assignRandomNickname } from '@/services/profileService';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

// The underline is drawn 100px wide and scaled to the active link, so only transform moves.
const BAR_WIDTH = 100;

/** Moves the underline under the current link, or hides it when no section matches. */
function placeBar(root: HTMLElement | null, animate: boolean): void {
  const bar = root?.querySelector<HTMLElement>('[data-nav-bar]');
  if (!root || !bar) return;
  const link = root.querySelector<HTMLElement>('[aria-current="page"]');
  if (!link || root.offsetWidth === 0) {
    gsap.to(bar, { opacity: 0, duration: animate ? 0.2 : 0, overwrite: true });
    return;
  }
  const inset = 16;
  const target = {
    x: link.offsetLeft + inset,
    scaleX: Math.max(0, link.offsetWidth - inset * 2) / BAR_WIDTH,
    opacity: 1,
  };
  const visible = Number(gsap.getProperty(bar, 'opacity')) > 0;
  if (animate && visible) {
    gsap.to(bar, { ...target, duration: 0.45, ease: 'power3.inOut', overwrite: true });
  } else {
    gsap.set(bar, target);
  }
}

/**
 * Clerk keeps a `__client_uat` cookie (a timestamp, 0 when signed out) on the site's own
 * domain, so the menu can say "Grown-up account" without loading Clerk on player pages.
 */
function hasAdultSession(): boolean {
  return /(?:^|;\s*)__client_uat(?:_[\w-]+)?=[1-9]/.test(document.cookie);
}

/**
 * Top bar on every browse page: logo, the main sections from desktop width, a Play button and
 * the player's avatar menu (profile, rounds, nickname, contact, settings, grown-up sign in).
 * Phones get the bottom TabBar for sections; the avatar menu is the same on every width.
 */
export function SiteHeader(): JSX.Element {
  const { pathname } = useLocation();
  const nav = useRef<HTMLElement>(null);
  const items = NAV_ITEMS.filter((item) => !item.tabOnly);
  const activeIndex = items.findIndex((item) => isNavActive(item, pathname));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => placeBar(nav.current, false));
      mm.add(`not all and ${REDUCED_MOTION}`, () => placeBar(nav.current, true));
    },
    { dependencies: [activeIndex], revertOnUpdate: false },
  );
  useEffect(() => {
    const onResize = (): void => placeBar(nav.current, false);
    window.addEventListener('resize', onResize);
    void document.fonts?.ready.then(onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 lg:px-6">
        <Link
          to="/"
          aria-label={t.nav.homeLink}
          className="group flex min-h-tap shrink-0 items-center rounded-full pr-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
        >
          <Logo
            size={36}
            className="[&_svg]:transition-transform [&_svg]:duration-300 group-hover:[&_svg]:-rotate-6"
          />
        </Link>
        <nav
          ref={nav}
          aria-label={t.nav.mainLabel}
          className="relative ml-2 hidden items-center lg:flex"
        >
          {items.map((item) => {
            const active = isNavActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-tap items-center rounded-full px-4 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary',
                  active ? 'font-bold text-content' : 'text-content-muted hover:text-content',
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <span
            aria-hidden="true"
            data-nav-bar
            className="pointer-events-none absolute bottom-0.5 left-0 h-[3px] w-[100px] origin-left rounded-full bg-primary opacity-0"
          />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/daily/play"
            className={buttonClasses(
              'play',
              'md',
              'hidden h-11 px-5 text-[0.95rem] lg:inline-flex',
            )}
          >
            {t.nav.play.label}
          </Link>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

/** The avatar button and its menu. Closes on outside click, Escape and navigation. */
function ProfileMenu(): JSX.Element {
  const { user, ensureSession, reload } = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const signedIn = useMemo(() => hasAdultSession(), [pathname, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = user?.nickname || t.nav.menu.player;
  const streak = user?.streak ?? 0;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (to: string): void => {
    setOpen(false);
    navigate(to);
  };
  const newName = async (): Promise<void> => {
    setOpen(false);
    await ensureSession();
    await assignRandomNickname().catch(() => null);
    await reload();
  };

  /** Arrow keys move between items, like a native menu. */
  const onMenuKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(
      wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  const item =
    'flex min-h-[2.75rem] w-full items-center gap-3 rounded-xl px-3 text-left text-[0.95rem] font-semibold text-content hover:bg-background focus-visible:bg-background focus-visible:outline-none';

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.nav.menu.open(name)}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-full border-2 border-surface-border bg-surface pl-1 pr-2.5 font-semibold transition-colors hover:border-content-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary lg:pr-3"
      >
        <AvatarBadge avatarId={user?.avatarId} nickname={user?.nickname} size="xs" />
        <span className="hidden max-w-[10rem] truncate text-sm lg:inline">{name}</span>
        {streak > 0 && (
          <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-fg lg:inline">
            {t.nav.menu.streak(streak)}
          </span>
        )}
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-content-muted" aria-hidden="true">
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t.nav.menu.label}
          onKeyDown={onMenuKey}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid w-72 gap-0.5 rounded-2xl border border-surface-border bg-surface p-2 shadow-float"
        >
          <div className="mb-1 flex items-center gap-3 border-b border-surface-border px-2 pb-3 pt-1">
            <AvatarBadge avatarId={user?.avatarId} nickname={user?.nickname} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-bold text-content">{name}</p>
              <p className="text-xs text-content-muted">
                {streak > 0 ? t.nav.menu.streak(streak) : t.nav.menu.noStreak}
              </p>
            </div>
          </div>
          <button role="menuitem" type="button" className={item} onClick={() => go('/me')}>
            {t.nav.menu.profile}
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => go('/me#games')}>
            {t.nav.menu.games}
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => void newName()}>
            {t.nav.menu.newName}
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => go('/contact')}>
            {t.nav.menu.contact}
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => go('/me/settings')}>
            {t.nav.menu.settings}
          </button>
          <div className="my-1 h-px bg-surface-border" />
          <button role="menuitem" type="button" className={item} onClick={() => go('/account')}>
            {signedIn ? t.nav.menu.grownUpSignedIn : t.nav.menu.grownUp}
            {!signedIn && (
              <span className="ml-auto text-xs font-medium text-content-muted">
                {t.nav.menu.grownUpHint}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
