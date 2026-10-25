import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Each variant sits on a darker "edge" shadow. On press the button drops 3px and the
// edge shrinks, so it feels like a physical game button. Transform + shadow only.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-edge-primary hover:bg-primary/95',
  secondary: 'bg-secondary text-secondary-fg shadow-edge-sun hover:bg-secondary/95', // dark text only on yellow
  ghost:
    'border-2 border-surface-border bg-surface text-content shadow-edge-surface hover:border-primary/40',
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
    'inline-flex select-none items-center justify-center gap-2 rounded-full font-display font-semibold tracking-wide',
    'touch-manipulation transition-[transform,box-shadow,background-color,border-color] duration-[120ms] ease-out',
    'hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-edge-pressed',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
