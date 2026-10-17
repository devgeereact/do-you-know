import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const WIDTHS = {
  narrow: 'max-w-2xl', // reading pages: quiz, daily, boards, profile, settings
  wide: 'max-w-5xl', // card grids: categories
} as const;

interface PageProps {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}

/** The page's <main>: one width scale, gutters and top spacing for every browse page. */
export function Page({ width = 'narrow', className, children }: PageProps): JSX.Element {
  return (
    <main className={cn('mx-auto px-4 pb-16 pt-4 md:px-8', WIDTHS[width], className)}>
      {children}
    </main>
  );
}
