import { useLocation } from 'react-router-dom';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn, isPlayPath } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Fixed bottom banner shown only while the device is offline. Play screens show their own,
 * more specific message, so the banner stays off there to avoid saying it twice.
 */
export function OfflineBanner(): JSX.Element | null {
  const online = useOnlineStatus();
  const { pathname } = useLocation();
  if (online || isPlayPath(pathname)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 z-50 animate-fade-up border-t border-surface-border bg-surface px-4 py-3 text-center text-sm text-content',
        // Sit above the phone tab bar.
        'bottom-[calc(3.75rem+env(safe-area-inset-bottom))] md:bottom-0',
      )}
    >
      {t.pwa.offline}
    </div>
  );
}
