import { Link } from 'react-router-dom';

const linkClass =
  'inline-flex min-h-tap items-center rounded-full px-2 font-semibold text-content-muted hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary';

/** Quiet footer: settings and the grown-ups' area, away from the playful bits. */
export function SiteFooter(): JSX.Element {
  return (
    <footer className="mt-8 border-t border-surface-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm md:px-8">
        <p className="text-content-muted">Do You Know · quick quizzes for curious minds</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-1">
          <Link to="/me/settings" className={linkClass}>
            Settings
          </Link>
          <Link to="/account" className={linkClass}>
            Parents and staff
          </Link>
        </nav>
      </div>
    </footer>
  );
}
