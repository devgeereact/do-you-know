import { useEffect } from 'react';
import { useSwitches } from '@/hooks/useSwitches';

/**
 * The "Easy-read font" switch: Atkinson Hyperlegible, self-hosted (the files ship with the app, nothing is
 * fetched from another site). The font files load only when the switch is on; the html attribute turns it on
 * and off without a reload.
 */
export function EasyReadFont(): null {
  const { switches } = useSwitches();
  const on = switches.easy_read;
  useEffect(() => {
    document.documentElement.dataset.easyRead = on ? 'true' : 'false';
    if (on) {
      void import('@fontsource/atkinson-hyperlegible/400.css');
      void import('@fontsource/atkinson-hyperlegible/700.css');
    }
  }, [on]);
  return null;
}
