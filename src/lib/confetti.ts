import { gsap, prefersReducedMotion } from '@/lib/motion';

// Token colour classes only (DESIGN-SYSTEM §2): no raw hex in the app.
const COLOURS = [
  'bg-secondary',
  'bg-primary',
  'bg-sky',
  'bg-correct',
  'bg-avatar-octopus',
  'bg-avatar-unicorn',
];
const SHAPES = ['rounded-full', 'rounded-sm', 'rounded-[2px]'];

/**
 * A short, decorative burst of confetti from an element (or the top of the screen).
 * Purely visual: aria-hidden, pointer-events none, removed when done, and skipped under
 * reduced motion. Never the only sign of a result.
 */
export function burstConfetti(origin?: Element | null, pieces = 36): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const box = origin?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
  const y = box ? box.top + box.height / 2 : window.innerHeight / 3;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'pointer-events-none fixed inset-0 z-[60] overflow-hidden';
  document.body.appendChild(layer);

  for (let i = 0; i < pieces; i += 1) {
    const bit = document.createElement('span');
    bit.className = `absolute block h-2.5 w-2 ${gsap.utils.random(COLOURS)} ${gsap.utils.random(SHAPES)}`;
    layer.appendChild(bit);
    gsap.set(bit, {
      left: x,
      top: y,
      xPercent: -50,
      yPercent: -50,
      rotation: gsap.utils.random(0, 360),
    });
    const angle = gsap.utils.random(-Math.PI, 0);
    const speed = gsap.utils.random(140, 380);
    gsap
      .timeline({ onComplete: () => bit.remove() })
      .to(bit, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
        rotation: `+=${gsap.utils.random(180, 720)}`,
        duration: 0.6,
        ease: 'power2.out',
      })
      .to(bit, { y: '+=220', opacity: 0, rotation: '+=180', duration: 1, ease: 'power1.in' });
  }
  window.setTimeout(() => layer.remove(), 1900);
}
