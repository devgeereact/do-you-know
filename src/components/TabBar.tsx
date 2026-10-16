import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS, isNavActive } from '@/components/navItems';
import { cn } from '@/lib/utils';

/** Phone navigation: four big thumb-reach tabs. Hidden from tablet width up. */
export function TabBar(): JSX.Element {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary',
                  active ? 'text-primary' : 'text-content-muted',
                )}
              >
                <span
                  className={cn(
                    'grid h-8 w-14 place-items-center rounded-full transition-colors duration-[120ms]',
                    active && 'bg-primary/15',
                  )}
                >
                  {item.icon}
                </span>
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
