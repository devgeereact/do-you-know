import { useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { t } from '@/i18n';

// A taste of the game, not a live question: nothing here is marked right or wrong,
// so no answer reaches the browser (see AGENTS.md §8).
const TEASER = t.home.teaser;

/**
 * The hero's example question card. It rises in, tilts a little towards the pointer, and a
 * "thinking" ring hops between the options as if a player were choosing, and the card and
 * bubbles part as the hero scrolls away. It never marks a pick right or wrong. Decorative
 * motion stops under reduced motion.
 */
export function HeroTeaser(): JSX.Element {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.from('[data-teaser-card]', {
          y: 40,
          rotation: 3,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          delay: 0.3,
        });
        gsap.from('[data-teaser-bubble]', {
          scale: 0,
          opacity: 0,
          duration: 0.6,
          ease: 'back.out(2.2)',
          stagger: 0.15,
          delay: 0.9,
        });

        const options = gsap.utils.toArray<HTMLElement>('[data-teaser-option]');
        const hop = gsap.timeline({ repeat: -1, repeatDelay: 1.6, delay: 1.6 });
        options.forEach((option) => {
          hop
            .to(option, { scale: 1.04, duration: 0.3, ease: 'back.out(2)' })
            .to(option, { borderColor: 'rgb(var(--primary))', duration: 0.2 }, '<')
            .to(
              option,
              { scale: 1, borderColor: 'rgb(var(--surface-border))', duration: 0.3 },
              '+=0.6',
            );
        });

        // Depth on scroll: as the hero leaves, the card lifts away and the bubbles drift
        // faster than it, so the stack reads as layers. Scrubbed, so it never runs on its own.
        const leave = { trigger: root.current, start: 'top 15%', end: 'bottom top', scrub: 0.6 };
        gsap.to('[data-teaser-card]', { yPercent: -18, ease: 'none', scrollTrigger: leave });
        gsap.utils.toArray<HTMLElement>('[data-teaser-bubble]').forEach((bubble, i) => {
          gsap.to(bubble, { y: -60 - i * 30, ease: 'none', scrollTrigger: leave });
        });

        const card = root.current?.querySelector<HTMLElement>('[data-teaser-card]');
        if (!card || !contextSafe) return;
        const tiltX = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
        const tiltY = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
        const onMove = contextSafe((event: PointerEvent) => {
          const box = card.getBoundingClientRect();
          tiltX(((event.clientX - box.left) / box.width - 0.5) * 8);
          tiltY(-((event.clientY - box.top) / box.height - 0.5) * 8);
        });
        const onLeave = contextSafe(() => {
          tiltX(0);
          tiltY(0);
        });
        const area = root.current;
        area?.addEventListener('pointermove', onMove);
        area?.addEventListener('pointerleave', onLeave);
        return () => {
          area?.removeEventListener('pointermove', onMove);
          area?.removeEventListener('pointerleave', onLeave);
        };
      });
    },
    { scope: root },
  );

  return (
    <figure
      ref={root}
      aria-label={t.home.exampleLabel}
      className="relative mx-auto hidden w-full max-w-sm [perspective:900px] sm:block"
    >
      <span
        aria-hidden="true"
        data-teaser-bubble
        className="absolute -left-8 top-6 z-10 grid h-14 w-14 place-items-center rounded-full bg-surface text-2xl shadow-lift"
      >
        🐙
      </span>
      <span
        aria-hidden="true"
        data-teaser-bubble
        className="absolute -right-6 bottom-10 z-10 grid h-12 w-12 place-items-center rounded-full bg-secondary text-xl shadow-edge-sun"
      >
        ⭐
      </span>
      <span
        aria-hidden="true"
        data-teaser-bubble
        className="absolute -top-7 right-10 z-10 grid h-11 w-11 place-items-center rounded-full bg-sky text-xl shadow-lift"
      >
        💡
      </span>
      <Card data-teaser-card className="relative shadow-lift [transform-style:preserve-3d]">
        <figcaption className="mb-4 flex items-center justify-between text-sm font-bold">
          <span className="rounded-full bg-background px-3 py-1 text-primary">
            {TEASER.category}
          </span>
          <span className="text-content-muted">{t.play.questionOf(3, 10)}</span>
        </figcaption>
        <p className="mb-5 font-display text-2xl font-semibold leading-snug text-content">
          {TEASER.prompt}
        </p>
        <ul className="grid grid-cols-2 gap-3">
          {TEASER.options.map((option) => (
            <li
              key={option}
              data-teaser-option
              className="flex min-h-[3.5rem] items-center justify-center rounded-full border-2 border-surface-border bg-background px-4 font-display text-lg font-semibold text-content"
            >
              {option}
            </li>
          ))}
        </ul>
      </Card>
    </figure>
  );
}
