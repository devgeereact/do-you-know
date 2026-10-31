import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS, isNavActive } from '@/components/navItems';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Phone and tablet navigation: four big thumb-reach tabs (Explore, Daily, Play, Boards). A soft pill slides behind the current tab's
 * icon; the tab also turns primary and carries aria-current, so the pill is never the only
 * signal. Hidden from desktop width up, where the header has the sections.
 */
export function TabBar(): JSX.Element {
  const { pathname } = useLocation();
  const root = useRef<HTMLElement>(null);
  const activeIndex = NAV_ITEMS.findIndex((item) => isNavActive(item, pathname));

  const placed = useRef(false);
  useGSAP(
    () => {
      const first = !placed.current;
      placed.current = true;
      const target = { xPercent: Math.max(0, activeIndex) * 100, opacity: activeIndex < 0 ? 0 : 1 };
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => gsap.set('[data-tab-pill]', target));
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        if (first) {
          gsap.set('[data-tab-pill]', target);
          return;
        }
        gsap.to('[data-tab-pill]', {
          ...target,
          duration: 0.4,
          ease: 'power3.inOut',
          overwrite: true,
        });
        if (activeIndex >= 0) {
          gsap.fromTo(
            `[data-tab-icon="${activeIndex}"]`,
            { y: 0 },
            { y: -3, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 },
          );
        }
      });
    },
    { scope: root, dependencies: [activeIndex], revertOnUpdate: false },
  );

  return (
    <nav
      ref={root}
      aria-label={t.nav.mainLabel}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="relative mx-auto max-w-md">
        {/* Same column layout as a tab (pill row + label row), so the pill sits behind the icon. */}
        <span
          aria-hidden="true"
          data-tab-pill
          className="pointer-events-none absolute inset-y-0 left-0 flex w-1/4 flex-col items-center justify-center gap-0.5"
        >
          <span className="h-8 w-14 rounded-full bg-primary/15" />
          <span className="h-4" />
        </span>
        <ul className="relative grid grid-cols-4">
          {NAV_ITEMS.map((item, i) => {
            const active = isNavActive(item, pathname);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary',
                    active ? 'text-primary' : 'text-content-muted',
                  )}
                >
                  <span data-tab-icon={i} className="grid h-8 w-14 place-items-center">
                    {item.icon}
                  </span>
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
