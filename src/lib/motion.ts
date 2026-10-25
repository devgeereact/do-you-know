import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

// Register every GSAP plugin the app uses once, before any component animates.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);
gsap.defaults({ ease: 'power3.out', duration: 0.5 });

/** Reduced motion: still show every state, but skip movement (DESIGN-SYSTEM §3). */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION).matches;
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
