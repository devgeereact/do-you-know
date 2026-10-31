import { useSyncExternalStore } from 'react';

/** True while the media query matches; follows changes (rotation, resizing). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The desktop breakpoint (Tailwind lg): computer layouts from here up, phone layouts below. */
export const DESKTOP = '(min-width: 1024px)';
