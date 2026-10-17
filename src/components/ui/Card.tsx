import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Semantic element; a plain box by default. */
  as?: 'div' | 'section' | 'article' | 'nav';
}

/** Surface container with the standard border, radius and padding tokens. */
export function Card({ as: Tag = 'div', className, ...props }: CardProps): JSX.Element {
  return (
    <Tag
      className={cn('rounded-2xl border-2 border-surface-border bg-surface p-6', className)}
      {...props}
    />
  );
}
