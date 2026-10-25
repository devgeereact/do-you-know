import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { t } from '@/i18n';

interface ProgressDotsProps {
  position: number; // 1-based
  total: number;
}

/**
 * "Question 3 of 10", a progress bar that slides along, and a dot per question.
 * The text is what screen readers hear; the bar and dots are decorative.
 */
export function ProgressDots({ position, total }: ProgressDotsProps): JSX.Element {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const done = total === 0 ? 0 : Math.min(1, (position - 1) / total);
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => gsap.set('[data-progress-fill]', { scaleX: done }));
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.to('[data-progress-fill]', { scaleX: done, duration: 0.6, ease: 'power3.out' });
        gsap.fromTo(
          '[data-progress-current]',
          { scale: 0.4 },
          { scale: 1, duration: 0.5, ease: 'back.out(3)' },
        );
      });
    },
    { scope: root, dependencies: [position, total], revertOnUpdate: false },
  );

  return (
    <div ref={root}>
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-sm font-bold text-content-muted">
          {t.play.questionOf(position, total)}
        </span>
        <ol aria-hidden="true" className="flex flex-wrap gap-1">
          {Array.from({ length: total }, (_, i) => (
            <li
              key={i}
              data-progress-current={i + 1 === position ? '' : undefined}
              className={cn(
                'h-2 w-2 rounded-full',
                i + 1 < position && 'bg-primary',
                i + 1 === position && 'w-4 bg-secondary',
                i + 1 > position && 'bg-surface-border',
              )}
            />
          ))}
        </ol>
      </div>
      <div
        aria-hidden="true"
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-border/60"
      >
        <div
          data-progress-fill
          className="h-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary to-sky"
        />
      </div>
    </div>
  );
}
