import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@/components/ui/Button';

/**
 * Registers the service worker and surfaces a non-destructive
 * "new version available" prompt. With skipWaiting:false the new SW
 * waits until the user opts in, so we never interrupt their work.
 */
export function UpdatePrompt(): JSX.Element | null {
  const { pathname } = useLocation();
  const [needRefresh, setNeedRefresh] = useState(false);
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if ('caches' in window) void caches.delete('supabase-api').catch(() => undefined);
    const updateSW = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => updateSW(true));
        setNeedRefresh(true);
      },
    });
  }, []);

  if (!needRefresh || pathname.startsWith('/play/')) return null;

  return (
    <div className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto flex max-w-md animate-fade-up items-center justify-between gap-4 rounded-2xl border-2 border-surface-border bg-surface p-4 shadow-lift">
      <p role="status" className="text-sm text-content">
        There’s a new version ready.
      </p>
      <Button size="sm" onClick={() => void update?.()}>
        Update now
      </Button>
    </div>
  );
}
