import { useRef } from 'react';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

interface TimerBadgeProps {
  secondsLeft: number;
  isLow: boolean;
}

/**
 * Seconds left. Announces at 10 s and 5 s only, and never flashes. When time runs low the
 * badge turns amber and gives one soft beat per second (scale only; still under reduced motion).
 */
export function TimerBadge({ secondsLeft, isLow }: TimerBadgeProps): JSX.Element {
  const badge = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      if (!isLow || !badge.current) return;
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.fromTo(
          badge.current,
          { scale: 1.12 },
          { scale: 1, duration: 0.4, ease: 'power2.out', overwrite: true },
        );
      });
    },
    { dependencies: [secondsLeft, isLow], revertOnUpdate: false },
  );
  const announce =
    secondsLeft === 10 || secondsLeft === 5 ? t.play.timer.announce(secondsLeft) : '';
  return (
    <>
      <span
        ref={badge}
        aria-hidden="true"
        className={cn(
          'inline-flex min-w-tap shrink-0 items-center justify-center rounded-full border-2 px-3 py-1 font-display text-lg font-semibold tabular-nums transition-colors duration-200',
          isLow
            ? 'border-warning bg-warning text-warning-fg'
            : 'border-surface-border bg-surface text-content',
        )}
      >
        {t.play.timer.badge(secondsLeft)}
      </span>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </>
  );
}
