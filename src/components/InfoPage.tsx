import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/** The help and info pages, in footer order. One shell, so moving between them feels like one place. */
const INFO_LINKS: { to: string; label: string }[] = [
  { to: '/how-to-play', label: t.footer.links.howToPlay },
  { to: '/about', label: t.footer.links.about },
  { to: '/privacy', label: t.footer.links.privacy },
  { to: '/terms', label: t.footer.links.terms },
  { to: '/contact', label: t.footer.links.contact },
  { to: '/me/settings', label: t.footer.links.settings },
];

interface InfoShellProps {
  title: string;
  /** One-line summary under the heading. */
  lead?: string;
  children: ReactNode;
  /** Show the "On this page" list built from the section headings (reading pages). */
  contents?: boolean;
}

/**
 * Full-width frame for How to play, About, Privacy, Terms, Contact and Settings: a title band,
 * a sticky menu of the info pages, the page itself and, on reading pages, a list of its sections.
 */
export function InfoShell({
  title,
  lead,
  children,
  contents = false,
}: InfoShellProps): JSX.Element {
  const body = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    if (!contents || !body.current) return;
    setToc(
      Array.from(body.current.querySelectorAll<HTMLElement>('section[id] > h2')).map((h) => ({
        id: (h.parentElement as HTMLElement).id,
        text: h.textContent ?? '',
      })),
    );
  }, [contents, title]);

  return (
    <main className="w-full">
      <header className="border-b border-surface-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">
            {t.info.shell.eyebrow}
          </p>
          <h1 className="mt-2 text-[2.2rem] leading-tight lg:text-5xl">{title}</h1>
          {lead && <p className="mt-3 max-w-[60ch] text-lg text-content-muted">{lead}</p>}
        </div>
      </header>

      <div
        className={cn(
          'mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 pb-16 pt-6 lg:gap-10 lg:px-8 lg:pt-10',
          contents
            ? 'lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_200px]'
            : 'lg:grid-cols-[200px_minmax(0,1fr)]',
        )}
      >
        <nav aria-label={t.info.shell.menu} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:gap-1 lg:overflow-visible lg:px-0">
            {INFO_LINKS.map((link) => (
              <li key={link.to} className="shrink-0">
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-[40px] items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary lg:rounded-xl lg:px-3',
                      isActive
                        ? 'bg-primary text-primary-fg lg:bg-primary/10 lg:text-primary'
                        : 'bg-surface text-content-muted ring-1 ring-surface-border hover:text-content lg:bg-transparent lg:ring-0 lg:hover:bg-surface',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div ref={body} className="min-w-0">
          {children}
        </div>

        {contents && toc.length > 1 && (
          <aside aria-label={t.info.shell.onThisPage} className="hidden xl:block">
            <div className="sticky top-24">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">
                {t.info.shell.onThisPage}
              </p>
              <ul className="mt-3 grid gap-1 border-l border-surface-border">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-sm text-content-muted hover:border-primary hover:text-content"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

interface InfoPageProps {
  title: string;
  lead: string;
  children: ReactNode;
}

/** Reading pages: How to play, About, Privacy and Terms. */
export function InfoPage({ title, lead, children }: InfoPageProps): JSX.Element {
  return (
    <InfoShell title={title} lead={lead} contents>
      <div className="grid max-w-[72ch] gap-0">{children}</div>
    </InfoShell>
  );
}

interface InfoSectionProps {
  /** Becomes the section's h2 and its accessible name. */
  heading: string;
  id?: string;
  children: ReactNode;
}

/** One topic: a heading and readable body text, separated from the next by a quiet rule. */
export function InfoSection({ heading, id, children }: InfoSectionProps): JSX.Element {
  const slug =
    id ??
    heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  return (
    <section
      id={slug}
      aria-labelledby={`${slug}-heading`}
      className="scroll-mt-24 break-words border-b border-surface-border py-7 first:pt-0 last:border-b-0"
    >
      <h2 id={`${slug}-heading`} className="text-2xl font-extrabold tracking-tight text-content">
        {heading}
      </h2>
      <div className="mt-3 space-y-3 text-[1.05rem] leading-relaxed text-content [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:marker:text-primary">
        {children}
      </div>
    </section>
  );
}
