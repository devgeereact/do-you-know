import type { ReactNode } from 'react';
import { BackLink } from '@/components/BackLink';
import { Card } from '@/components/ui/Card';
import { Page } from '@/components/ui/Page';

interface InfoPageProps {
  title: string;
  /** One-line summary under the heading. */
  lead: string;
  children: ReactNode;
}

/** Shared frame for the reading pages: How to play, About, Contact, Privacy and Terms. */
export function InfoPage({ title, lead, children }: InfoPageProps): JSX.Element {
  return (
    <Page>
      <BackLink to="/" label="All quizzes" />
      <h1 className="mt-2 text-4xl font-semibold text-content">{title}</h1>
      <p className="mt-3 text-lg text-content-muted">{lead}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </Page>
  );
}

interface InfoSectionProps {
  /** Becomes the section's h2 and its accessible name. */
  heading: string;
  id?: string;
  children: ReactNode;
}

/** One card per topic, with a heading and readable body text. */
export function InfoSection({ heading, id, children }: InfoSectionProps): JSX.Element {
  const headingId = `${id ?? heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`;
  return (
    <Card as="section" id={id} aria-labelledby={headingId} className="break-words">
      <h2 id={headingId} className="text-2xl font-semibold text-content">
        {heading}
      </h2>
      <div className="mt-3 space-y-3 text-content [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </Card>
  );
}
