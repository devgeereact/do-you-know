import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS, isNavActive } from '@/components/navItems';
import { cn } from '@/lib/utils';

/**
 * Top bar on every browse page: logo home, plus the main nav from tablet width up.
 * Phones get the same destinations in the bottom TabBar.
 */
export function SiteHeader(): JSX.Element {
  const { pathname } = useLocation();
  return (
    <header className="border-b border-surface-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 md:px-8">
        <Link
          to="/"
          aria-label="Do You Know home"
          className="flex min-h-tap items-center gap-2 rounded-full pr-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
        >
          <img src="/favicon.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <span className="font-display text-lg font-semibold text-content">Do You Know</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-tap items-center rounded-full px-4 font-semibold transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary',
                  active ? 'bg-primary text-primary-fg' : 'text-primary hover:bg-surface',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
