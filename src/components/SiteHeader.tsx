import { Link, useLocation } from 'react-router-dom';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';

export function SiteHeader(): JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const libraryActive =
    pathname === '/' || pathname.startsWith('/q/') || pathname.startsWith('/c/');
  const tabs = [
    { to: '/', label: copy.nav.quizzes, accessible: copy.nav.quizzes },
    { to: '/daily', label: copy.nav.daily, accessible: copy.challenge.daily },
    { to: '/leaderboards', label: copy.nav.boards, accessible: copy.compete.heading },
    { to: '/me', label: copy.nav.progress, accessible: copy.game.profile },
  ];
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl [@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none [@media(prefers-contrast:more)]:border-b [@media(prefers-contrast:more)]:border-content [@media(prefers-contrast:more)]:bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 px-4 py-3 md:px-8 lg:grid-cols-[auto_1fr_auto]">
        <Link
          to="/"
          className="flex min-h-tap w-fit items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-content"
        >
          <img src="/favicon.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <span>{copy.brand}</span>
        </Link>
        <nav
          aria-label={copy.nav.label}
          className="col-span-2 row-start-2 grid grid-cols-4 gap-1 rounded-2xl bg-surface p-1 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:justify-self-end"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              aria-label={tab.accessible}
              aria-current={
                (tab.to === '/' ? libraryActive : pathname === tab.to) ? 'page' : undefined
              }
              className={cn(
                'flex min-h-tap items-center justify-center rounded-xl px-2 text-base font-bold transition-colors duration-100 active:bg-primary/15 lg:px-4',
                (tab.to === '/' ? libraryActive : pathname === tab.to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-content-muted hover:bg-background hover:text-content',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <Button
          variant="ghost"
          className="col-start-2 row-start-1 min-w-tap px-3 lg:col-start-3"
          onClick={toggleTheme}
          aria-label={copy.nav.theme(theme === 'light' ? 'dark' : 'light')}
        >
          <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
        </Button>
      </div>
    </header>
  );
}
