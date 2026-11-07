import { cn } from '@/lib/utils';

/**
 * The leader's crown. Decorative on its own: wherever it appears, a visible or screen-reader label
 * says who is leading, so the meaning never depends on the picture. Drawn with design tokens only.
 */
export function Crown({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn(
        'inline-block h-[1.1em] w-[1.1em] shrink-0 fill-secondary stroke-content',
        className,
      )}
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 19H5z" />
      <path d="M5.5 21.5h13" />
    </svg>
  );
}
