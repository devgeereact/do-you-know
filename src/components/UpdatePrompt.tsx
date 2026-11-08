import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@/components/ui/Button';
import { shouldApplyUpdate } from '@/lib/updateTiming';
import { t } from '@/i18n';

/**
 * Registers the service worker and surfaces a non-destructive
 * "new version available" prompt. With skipWaiting:false the new SW
 * waits, so we never interrupt a game, a form or the Studio. On a calm page it
 * is applied without a tap: right after the app opens, or when the player moves
 * to another page, so a returning visitor never keeps an old design for days.
 */
export function UpdatePrompt(): JSX.Element | null {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);
  const { pathname } = useLocation();
  const found = useRef<{ after: number; path: string } | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        found.current = { after: performance.now(), path: pathRef.current };
        setUpdate(() => () => updateSW(true));
        setNeedRefresh(true);
      },
    });
  }, []);

  useEffect(() => {
    if (!needRefresh || !update || !found.current) return;
    if (
      shouldApplyUpdate({
        pathname,
        foundAfterMs: found.current.after,
        foundOnPath: found.current.path,
      })
    ) {
      void update();
    }
  }, [needRefresh, update, pathname]);

  if (!needRefresh) return null;

  return (
    <div
      role="region"
      aria-label={t.pwa.update.label}
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto md:bottom-6 flex max-w-md animate-fade-up items-center justify-between gap-4 rounded-2xl border-2 border-surface-border bg-surface p-4 shadow-lift"
    >
      <p role="status" className="text-sm text-content">
        {t.pwa.update.ready}
      </p>
      <Button onClick={() => void update?.()}>{t.pwa.update.action}</Button>
    </div>
  );
}
