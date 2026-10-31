import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/brand/Logo';
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
    <footer className="border-t border-surface-border bg-surface/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm md:flex-row md:items-center md:justify-between lg:px-6">
        <p className="flex items-center gap-2 text-content-muted">
          <LogoMark size={24} />
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
