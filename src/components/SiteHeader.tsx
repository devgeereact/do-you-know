import { Link } from 'react-router-dom';

/** Slim top bar for browse pages: logo home, and the player's own games. */
export function SiteHeader(): JSX.Element {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-8">
      <Link
        to="/"
        aria-label="Do You Know home"
        className="flex min-h-tap items-center gap-2 rounded-full pr-2"
      >
        <img
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="hidden font-display text-lg font-semibold text-content sm:inline">
          Do You Know
        </span>
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1">
        <Link
          to="/leaderboards"
          className="inline-flex min-h-tap items-center rounded-full px-3 font-semibold text-primary"
        >
          Leaderboards
        </Link>
        <Link
          to="/me"
          className="inline-flex min-h-tap items-center rounded-full px-3 font-semibold text-primary"
        >
          My games
        </Link>
      </nav>
    </header>
  );
}
