import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS, isNavActive } from '@/components/navItems';
import { buttonClasses } from '@/components/ui/buttonClasses';
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
  // Hidden nav (phones) measures as zero; the tab bar does this job there.
  if (!link || root.offsetWidth === 0) {
    gsap.to(bar, { opacity: 0, duration: animate ? 0.2 : 0, overwrite: true });
    return;
  }
  const inset = 16; // matches px-4 on the links
  const target = {
    x: link.offsetLeft + inset,
    scaleX: Math.max(0, link.offsetWidth - inset * 2) / BAR_WIDTH,
    opacity: 1,
  };
  // The first placement (bar still hidden) jumps; later ones glide.
  const visible = Number(gsap.getProperty(bar, 'opacity')) > 0;
  if (animate && visible) {
    gsap.to(bar, { ...target, duration: 0.45, ease: 'power3.inOut', overwrite: true });
  } else {
    gsap.set(bar, target);
  }
}

/**
 * Clerk keeps a `__client_uat` cookie (a timestamp, 0 when signed out) on the site's own
 * domain, so the header can say "Account" for a signed-in adult without loading Clerk on
 * player pages. Clerk itself still loads only on /account.
 */
function hasAdultSession(): boolean {
  return /(?:^|;\s*)__client_uat(?:_[\w-]+)?=[1-9]/.test(document.cookie);
}

/**
 * Top bar on every browse page: logo home, plus the main nav from tablet width up. A short
 * underline glides to the current section; the link also turns bold primary and carries
 * aria-current, so the line is never the only signal. Phones get the bottom TabBar. The
 * adult sign-in button sits at the right on every width.
 */
export function SiteHeader(): JSX.Element {
  const { pathname } = useLocation();
  const nav = useRef<HTMLElement>(null);
  const activeIndex = NAV_ITEMS.findIndex((item) => isNavActive(item, pathname));
  // Read again on each navigation, so the label changes after signing in or out.
  const signedIn = useMemo(() => hasAdultSession(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const onAccount = pathname.startsWith('/account');

  // Glide on navigation (jump under reduced motion); measure again when fonts or width change.
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
    <header className="sticky top-0 z-40 border-b border-surface-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 md:px-8">
        <Link
          to="/"
          aria-label={t.nav.homeLink}
          className="group flex min-h-tap items-center gap-2.5 rounded-full pr-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
        >
          <img
            src="/favicon.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 transition-transform duration-300 ease-out group-hover:-rotate-12 group-hover:scale-110"
          />
          <span className="font-display text-xl font-semibold tracking-tight text-content">
            {t.common.siteName}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <nav
            ref={nav}
            aria-label={t.nav.mainLabel}
            className="relative hidden items-center md:flex"
          >
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item, pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-tap items-center rounded-full px-4 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary',
                    active
                      ? 'font-bold text-primary'
                      : 'text-content-muted hover:bg-surface/80 hover:text-content',
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
          <Link
            to="/account"
            title={t.nav.accountHint}
            aria-current={onAccount ? 'page' : undefined}
            className={buttonClasses('ghost', 'md', 'h-11 px-5 text-base')}
          >
            {signedIn ? t.nav.account : t.nav.signIn}
          </Link>
        </div>
      </div>
    </header>
  );
}
