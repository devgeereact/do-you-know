import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@/components/ui/Button';
import { t } from '@/i18n';

/**
 * Registers the service worker and surfaces a non-destructive
 * "new version available" prompt. With skipWaiting:false the new SW
 * waits until the user opts in, so we never interrupt their work.
 */
export function UpdatePrompt(): JSX.Element | null {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => updateSW(true));
        setNeedRefresh(true);
      },
    });
  }, []);

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
