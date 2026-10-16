import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/Button';
import { isPlayPath } from '@/lib/utils';

const DISMISS_KEY = 'dyk-install-dismissed';
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Dismissible banner offering to install the PWA when eligible. Never shown
 * mid-game, where it would cover the answers. "Not now" holds for two weeks.
 */
export function InstallPrompt(): JSX.Element | null {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const { pathname } = useLocation();
  if (!isInstallable || dismissed || isPlayPath(pathname)) return null;

  const dismiss = (): void => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* it just asks again next visit */
    }
  };

  return (
    <div
      role="region"
      aria-label="Install the app"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md animate-fade-up flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-surface-border bg-surface p-4 shadow-lift md:bottom-6"
    >
      <div className="min-w-[12rem] flex-1">
        <p className="font-display font-semibold text-content">Install Do You Know</p>
        <p className="text-sm text-content-muted">
          Opens like an app on your phone, tablet or computer. No app store needed.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" onClick={dismiss}>
          Not now
        </Button>
        <Button onClick={() => void promptInstall()}>Install</Button>
      </div>
    </div>
  );
}
