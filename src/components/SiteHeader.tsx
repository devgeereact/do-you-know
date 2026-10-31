import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Logo } from '@/components/brand/Logo';
import { NAV_ITEMS, isNavActive } from '@/components/navItems';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useSession } from '@/hooks/useSession';
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
 * Top bar on every browse page: logo, the main sections from desktop width, a Play button and
 * a link to the player's profile.
 * Phones get the bottom TabBar for sections; the profile link is the same on every width.
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
          <ProfileLink />
        </div>
      </div>
    </header>
  );
}

/**
 * The player's avatar and nickname: one link to their profile, where everything about them lives.
 * A dot shows when the site has replied to something they sent.
 */
function ProfileLink(): JSX.Element {
  const { user } = useSession();
  const { pathname } = useLocation();
  const name = user?.nickname || t.nav.menu.player;
  const unread = (user?.unreadMessages ?? 0) > 0;
  return (
    <Link
      to="/me"
      aria-current={pathname === '/me' ? 'page' : undefined}
      aria-label={unread ? t.nav.menu.openUnread(name) : t.nav.menu.open(name)}
      className="relative flex h-11 items-center gap-2 rounded-full border-2 border-surface-border bg-surface pl-1 pr-1 font-semibold transition-colors hover:border-content-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary sm:pr-3.5"
    >
      <AvatarBadge avatarId={user?.avatarId} nickname={user?.nickname} size="xs" />
      <span className="hidden max-w-[11rem] truncate text-[0.95rem] sm:inline">{name}</span>
      {unread && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-tang"
        />
      )}
    </Link>
  );
}
