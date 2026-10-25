import type { RefObject } from 'react';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';

/**
 * Every new page rises softly into place: the first child of `scope` fades up 14px in under
 * half a second. Opacity and transform only, cleared afterwards so nothing lingers on the
 * page (sticky and fixed children behave normally). Input is never blocked, and reduced
 * motion shows the page at once.
 */
export function usePageEnter(scope: RefObject<HTMLElement>, key: string): void {
  useGSAP(
    () => {
      const page = scope.current?.firstElementChild;
      if (!page) return;
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.fromTo(
          page,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'opacity,transform' },
        );
      });
    },
    { scope, dependencies: [key] },
  );
}
