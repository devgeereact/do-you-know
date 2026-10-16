import { useLocation } from 'react-router-dom';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn, isPlayPath } from '@/lib/utils';

/** Fixed bottom banner shown only while the device is offline. */
export function OfflineBanner(): JSX.Element | null {
  const online = useOnlineStatus();
  const { pathname } = useLocation();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 z-50 animate-fade-up border-t border-surface-border bg-surface px-4 py-3 text-center text-sm text-content',
        // Sit above the phone tab bar on browse pages; play screens have none.
        isPlayPath(pathname)
          ? 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
          : 'bottom-[calc(3.75rem+env(safe-area-inset-bottom))] md:bottom-0',
      )}
    >
      You’re offline. Some things won’t load until you’re back online.
    </div>
  );
}
