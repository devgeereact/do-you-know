import { Link } from 'react-router-dom';
import { t } from '@/i18n';

const linkClass =
  'inline-flex min-h-tap items-center rounded-full px-2 font-semibold text-content-muted hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary';

const LINKS: { to: string; label: string }[] = [
  { to: '/how-to-play', label: t.footer.links.howToPlay },
  { to: '/about', label: t.footer.links.about },
  { to: '/privacy', label: t.footer.links.privacy },
  { to: '/terms', label: t.footer.links.terms },
  { to: '/contact', label: t.footer.links.contact },
  { to: '/me/settings', label: t.footer.links.settings },
  { to: '/account', label: t.footer.links.account },
];

/** Quiet footer: help, legal pages and the grown-ups' area, away from the playful bits. */
export function SiteFooter(): JSX.Element {
  return (
    <footer className="mt-12 border-t border-surface-border bg-surface/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <p className="flex items-center gap-2 text-content-muted">
          <img src="/favicon.svg" alt="" width={24} height={24} className="h-6 w-6" />
          {t.footer.tagline}
        </p>
        <nav aria-label={t.footer.label}>
          <ul className="-mx-2 flex flex-wrap gap-x-1">
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
