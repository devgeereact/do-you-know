import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ReactLenis, type LenisRef } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { gsap, ScrollTrigger } from '@/lib/motion';

/**
 * One Lenis instance for the whole document, driven by GSAP's ticker so smooth scroll and
 * ScrollTrigger share a single frame loop. Lenis turns itself off under reduced motion.
 */
export function SmoothScroll(): JSX.Element {
  const lenisRef = useRef<LenisRef>(null);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Lenis moves the real window scroll, so ScrollTrigger hears every frame without a bridge.
    const update = (time: number): void => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    // Web fonts reflow every heading once they land, which moves every trigger.
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => gsap.ticker.remove(update);
  }, []);

  // A new page starts at the top unless the link points at a section; layout changed, so
  // every ScrollTrigger measures again.
  useEffect(() => {
    if (!hash) lenisRef.current?.lenis?.scrollTo(0, { immediate: true, force: true });
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname, hash]);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, lerp: 0.12, anchors: { offset: -16 }, allowNestedScroll: true }}
    />
  );
}
