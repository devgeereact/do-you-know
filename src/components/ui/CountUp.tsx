import { useRef } from 'react';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

interface CountUpProps {
  value: number;
  className?: string;
}

/**
 * A whole number that counts up to its value when it appears or changes. Screen readers get
 * the final number straight away; the counting copy is hidden from them. Reduced motion shows
 * the final number with no counting.
 */
export function CountUp({ value, className }: CountUpProps): JSX.Element {
  const shown = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = shown.current;
      if (!el) return;
      const format = (n: number): string => Math.round(n).toLocaleString(t.locale);
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        const counter = { n: 0 };
        gsap.to(counter, {
          n: value,
          duration: Math.min(1.2, 0.4 + value * 0.04),
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = format(counter.n);
          },
          onComplete: () => {
            el.textContent = format(value);
          },
        });
        return () => {
          el.textContent = format(value);
        };
      });
    },
    { dependencies: [value] },
  );

  return (
    <span className={cn('tabular-nums', className)}>
      {/* key: a new value gets a fresh text node, so React and GSAP never share one. */}
      <span key={value} ref={shown} aria-hidden="true">
        {value.toLocaleString(t.locale)}
      </span>
      <span className="sr-only">{value.toLocaleString(t.locale)}</span>
    </span>
  );
}
