import type { ReactNode } from 'react';
import { BackLink } from '@/components/BackLink';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** "Up a level" link above the title. */
  back?: { to: string; label: string };
  /** Small line above the title (a date, a category). */
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Decorative tile beside the title (category emoji, avatar). */
  icon?: ReactNode;
  /** Buttons or links under the lead. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The one page header pattern for every browse page: back link, eyebrow, h1, lead and
 * actions on a fixed rhythm. The page-enter motion in AppLayout moves it with the page.
 */
export function PageHeader({
  back,
  eyebrow,
  title,
  lead,
  icon,
  actions,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header className={cn('mb-8', className)}>
      {back && <BackLink to={back.to} label={back.label} />}
      <div className={cn('flex items-center gap-4', back && 'mt-3')}>
        {icon}
        <div className="min-w-0">
          {eyebrow && <p className="text-sm font-bold text-content-muted">{eyebrow}</p>}
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-content md:text-5xl">
            {title}
          </h1>
        </div>
      </div>
      {lead && <p className="mt-3 max-w-prose text-pretty text-lg text-content-muted">{lead}</p>}
      {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
