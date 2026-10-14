import { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/Button';

/** Dismissible banner offering to install the PWA when eligible. */
export function InstallPrompt(): JSX.Element | null {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  if (!isInstallable || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Install the app"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md animate-fade-up items-center justify-between gap-3 rounded-2xl border-2 border-surface-border bg-surface p-4 shadow-lift"
    >
      <div>
        <p className="font-display font-semibold text-content">
          Put Do You Know on your home screen
        </p>
        <p className="text-sm text-content-muted">It opens like an app. No app store needed.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          Not now
        </Button>
        <Button size="sm" onClick={() => void promptInstall()}>
          Install
        </Button>
      </div>
    </div>
  );
}
