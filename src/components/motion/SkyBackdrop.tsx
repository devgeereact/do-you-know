import { useRef } from 'react';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';

/**
 * The playful sky behind every browse page: soft clouds, a sun and twinkling stars that
 * drift slowly and move at different speeds as the page scrolls (parallax). Decorative
 * only: aria-hidden, behind content, no pointer events, still under reduced motion.
 */
export function SkyBackdrop(): JSX.Element {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((el, i) => {
          gsap.to(el, {
            x: gsap.utils.random(-24, 24),
            y: gsap.utils.random(-14, 14),
            rotation: gsap.utils.random(-6, 6),
            duration: gsap.utils.random(5, 9),
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: i * 0.3,
          });
        });
        gsap.utils.toArray<HTMLElement>('[data-depth]').forEach((el) => {
          gsap.to(el, {
            yPercent: -Number(el.dataset.depth) * 60,
            ease: 'none',
            scrollTrigger: { start: 0, end: 'max', scrub: 0.6 },
          });
        });
        gsap.to('[data-twinkle]', {
          opacity: 0.25,
          scale: 0.7,
          duration: 1.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          stagger: { each: 0.35, from: 'random' },
        });
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-sky/20 via-background to-background"
    >
      <div data-depth="0.4" className="absolute -right-16 -top-16 md:right-[8%] md:top-10">
        <div
          data-drift
          className="h-44 w-44 rounded-full bg-secondary/55 ring-[18px] ring-secondary/15 dark:bg-content/10 dark:ring-content/[0.04] md:h-56 md:w-56"
        />
      </div>
      <Cloud depth="0.9" className="left-[-4rem] top-[18%] w-56 md:w-72" />
      <Cloud depth="0.6" className="right-[-3rem] top-[48%] w-44 opacity-80 md:w-64" />
      <Cloud depth="1.2" className="left-[30%] top-[78%] w-40 opacity-70 md:w-56" />
      {STARS.map((star) => (
        <span key={star} data-twinkle className={`absolute text-secondary/70 ${star}`}>
          <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
            <path d="M12 1.5l2.9 6.9 7.4.6-5.6 4.9 1.7 7.3L12 17.3l-6.4 3.9 1.7-7.3L1.7 9l7.4-.6z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

// Positions only (sizes and places); colour comes from the token class above.
const STARS = [
  'left-[8%] top-[12%] h-4 w-4',
  'left-[22%] top-[34%] h-3 w-3',
  'right-[18%] top-[30%] h-5 w-5',
  'right-[34%] top-[8%] h-3 w-3',
  'left-[56%] top-[62%] h-4 w-4',
  'left-[12%] top-[70%] h-3 w-3',
  'right-[8%] top-[86%] h-4 w-4',
];

function Cloud({ depth, className }: { depth: string; className: string }): JSX.Element {
  return (
    <div data-depth={depth} className={`absolute ${className}`}>
      <svg data-drift viewBox="0 0 200 90" className="w-full fill-surface/80 dark:fill-surface/40">
        <path d="M40 80h120a32 32 0 0 0 4-63.7A44 44 0 0 0 82 18 30 30 0 0 0 40 46a17 17 0 0 0 0 34z" />
      </svg>
    </div>
  );
}
