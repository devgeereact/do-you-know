import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Primary actions retain the playful edge; secondary controls stay quiet.
// Immediate press feedback never delays committing the click.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-edge-primary hover:bg-primary/95',
  secondary: 'bg-secondary text-secondary-fg shadow-edge-sun hover:bg-secondary/95', // dark text only on yellow
  ghost:
    'border border-surface-border bg-surface text-content hover:bg-background hover:border-primary/40',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm', // admin tables only
  md: 'h-12 px-6 text-base', // 48px touch target
  lg: 'h-14 px-8 text-lg',
};

/**
 * Class string for the design-system button. Use it on a router `<Link>` when the
 * action navigates, so we never nest a `<button>` inside an `<a>`.
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-full font-sans font-bold',
    'touch-manipulation transition-[transform,box-shadow,background-color,border-color] duration-[120ms] ease-out',
    'motion-safe:active:scale-[0.98] active:shadow-none',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
