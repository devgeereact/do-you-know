import { cn } from '@/lib/utils';

interface TimerBadgeProps {
  secondsLeft: number;
  isLow: boolean;
}

/** Seconds left. Announces at 10 s and 5 s only, and never flashes. */
export function TimerBadge({ secondsLeft, isLow }: TimerBadgeProps): JSX.Element {
  const announce = secondsLeft === 10 || secondsLeft === 5 ? `${secondsLeft} seconds left` : '';
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex min-w-tap items-center justify-center rounded-full px-3 py-1 font-display text-lg font-semibold tabular-nums',
          isLow ? 'bg-warning text-warning-fg' : 'bg-surface text-content',
        )}
      >
        {secondsLeft}s
      </span>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </>
  );
}
