import type { RefObject } from 'react';
import { gsap, ScrollTrigger, useGSAP, REDUCED_MOTION } from '@/lib/motion';

/**
 * Rises every `[data-reveal]` element inside `scope` into place as it scrolls into view,
 * in small staggered batches. Only opacity and transform move, so content is always in the
 * layout (and readable by tests and screen readers); reduced motion skips it entirely.
 * Pass `deps` that change when the list renders new items.
 */
export function useReveal(scope: RefObject<HTMLElement>, deps: unknown[] = []): void {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        const items = gsap.utils
          .toArray<HTMLElement>('[data-reveal]', scope.current)
          .filter((el) => !el.dataset.revealed);
        if (items.length === 0) return;
        gsap.set(items, { opacity: 0, y: 28 });
        ScrollTrigger.batch(items, {
          start: 'top 92%',
          once: true,
          onEnter: (batch) => {
            batch.forEach((el) => ((el as HTMLElement).dataset.revealed = 'true'));
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, overwrite: true });
          },
        });
        // New items change the page height, so triggers made earlier measure again.
        ScrollTrigger.refresh();
      });
    },
    { scope, dependencies: deps, revertOnUpdate: false },
  );
}
