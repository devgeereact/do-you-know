import { Link } from 'react-router-dom';

const linkClass =
  'inline-flex min-h-tap items-center rounded-full px-2 font-semibold text-content-muted hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary';

const LINKS: { to: string; label: string }[] = [
  { to: '/how-to-play', label: 'How to play' },
  { to: '/about', label: 'About' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/contact', label: 'Contact' },
  { to: '/me/settings', label: 'Settings' },
  { to: '/account', label: 'Parents and staff' },
];

/** Quiet footer: help, legal pages and the grown-ups' area, away from the playful bits. */
export function SiteFooter(): JSX.Element {
  return (
    <footer className="mt-8 border-t border-surface-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm md:px-8">
        <p className="text-content-muted">Do You Know · quick quizzes for curious minds</p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-1">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
