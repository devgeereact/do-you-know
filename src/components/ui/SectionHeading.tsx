import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  id?: string;
  children: ReactNode;
  /** A link or button on the right, such as "Full leaderboard". */
  action?: ReactNode;
  className?: string;
}

/**
 * Every section title on the browse pages: one size, one gap, an optional action. On a page
 * that calls `useReveal`, the title rises in just ahead of its cards.
 */
export function SectionHeading({
  id,
  children,
  action,
  className,
}: SectionHeadingProps): JSX.Element {
  return (
    <div
      data-reveal
      className={cn('mb-5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1', className)}
    >
      <h2 id={id} className="text-2xl font-semibold tracking-tight text-content md:text-3xl">
        {children}
      </h2>
      {action}
    </div>
  );
}
