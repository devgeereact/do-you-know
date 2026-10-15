import { copy } from '@/lib/copy';
import { Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';

export function SiteHeader(): JSX.Element {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 md:px-8">
      <Link
        to="/"
        className="flex min-h-tap items-center gap-3 font-display text-xl font-semibold text-content"
      >
        <img src="/favicon.svg" alt="" width={44} height={44} />
        <span>{copy.brand}</span>
      </Link>
      <nav aria-label={copy.nav.label} className="flex flex-wrap items-center gap-3">
        <a
          href="/#quizzes"
          className="inline-flex min-h-tap items-center px-3 font-bold text-primary"
        >
          {copy.nav.quizzes}
        </a>
        <Link
          to="/daily"
          className="inline-flex min-h-tap items-center px-3 font-bold text-primary"
        >
          {copy.challenge.daily}
        </Link>
        <Link
          to="/leaderboards"
          className="inline-flex min-h-tap items-center px-3 font-bold text-primary"
        >
          {copy.compete.heading}
        </Link>
        <Link to="/me" className="inline-flex min-h-tap items-center px-3 font-bold text-primary">
          {copy.game.profile}
        </Link>
        <Button
          variant="ghost"
          onClick={toggleTheme}
          aria-label={copy.nav.theme(theme === 'light' ? 'dark' : 'light')}
        >
          <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
        </Button>
      </nav>
    </header>
  );
}
