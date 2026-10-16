import { useEffect, type ReactNode } from 'react';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useSession } from '@/hooks/useSession';

/** Pages that need a player (settings) start a guest session; no email is ever asked for. */
export function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
  const { user, loading } = useSession();
  const { ensureSession, error } = useGuestSession();

  useEffect(() => {
    if (!loading && !user) ensureSession().catch(() => undefined);
  }, [loading, user, ensureSession]);

  if (error) {
    return (
      <p role="alert" className="p-6 text-content">
        {error}
      </p>
    );
  }
  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-primary"
          aria-label="Loading"
          role="status"
        />
      </div>
    );
  }
  return <>{children}</>;
}
