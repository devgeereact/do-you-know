import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const WIDTHS = {
  narrow: 'max-w-3xl', // reading pages: settings, legal, account
  wide: 'max-w-6xl', // the 12-column pages: home, subject, quiz, me, contact
} as const;

interface PageProps {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}

/** The page's <main>: one width scale, gutters and top spacing for every browse page. */
export function Page({ width = 'narrow', className, children }: PageProps): JSX.Element {
  return (
    <main
      className={cn('mx-auto w-full px-4 pb-12 pt-5 lg:px-6 lg:pt-8', WIDTHS[width], className)}
    >
      {children}
    </main>
  );
}
