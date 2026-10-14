import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-fg hover:bg-secondary/90', // dark text only on yellow
  ghost: 'bg-transparent text-content hover:bg-surface border border-surface-border',
};

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm', // admin tables only
  md: 'h-12 px-6 text-base', // 48px touch target
  lg: 'h-14 px-8 text-lg',
};

/** Design-system button: chunky pill, 48px+ touch target at md/lg. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold',
        'transition-transform duration-150 ease-in-out active:scale-[0.98] hover:scale-[1.02]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
