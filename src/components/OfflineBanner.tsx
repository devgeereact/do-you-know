import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/** Fixed bottom banner shown only while the device is offline. */
export function OfflineBanner(): JSX.Element | null {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 animate-fade-up border-t border-surface-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-content"
    >
      You’re offline. Some things won’t load until you’re back online.
    </div>
  );
}
