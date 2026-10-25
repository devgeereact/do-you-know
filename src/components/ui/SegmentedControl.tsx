import { useRef } from 'react';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Equal-width toggle buttons with a pill that slides to the chosen one. The buttons keep
 * aria-pressed and their own colour change, so the pill is never the only signal. Only the
 * pill's transform moves; reduced motion jumps it into place.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const placed = useRef(false);
  useGSAP(
    () => {
      const first = !placed.current;
      placed.current = true;
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => gsap.set('[data-segment-pill]', { xPercent: index * 100 }));
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        if (first) {
          gsap.set('[data-segment-pill]', { xPercent: index * 100 });
          return;
        }
        gsap.to('[data-segment-pill]', {
          xPercent: index * 100,
          duration: 0.45,
          ease: 'power3.inOut',
          overwrite: true,
        });
      });
    },
    { scope: root, dependencies: [index], revertOnUpdate: false },
  );

  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className={cn(
        'relative grid rounded-full border-2 border-surface-border bg-surface p-1',
        className,
      )}
    >
      <span
        aria-hidden="true"
        data-segment-pill
        className={cn(
          'pointer-events-none absolute inset-y-1 left-1 rounded-full bg-primary shadow-edge-primary',
          WIDTH[options.length] ?? 'w-1/2',
        )}
      />
      <div className={cn('relative grid', COLUMNS[options.length] ?? 'grid-cols-2')}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'min-h-tap rounded-full px-3 text-sm font-bold leading-tight transition-colors duration-200 sm:text-base',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary',
                active ? 'text-primary-fg' : 'text-content hover:text-primary',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The pill is exactly one segment wide (inside the 0.25rem padding on each side).
const WIDTH: Record<number, string> = {
  2: 'w-[calc((100%-0.5rem)/2)]',
  3: 'w-[calc((100%-0.5rem)/3)]',
  4: 'w-[calc((100%-0.5rem)/4)]',
};
const COLUMNS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};
