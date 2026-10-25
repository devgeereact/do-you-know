import { useCallback, useState } from 'react';
import { reportError } from '@/lib/sentry';
import { useSession } from '@/hooks/useSession';
import { t } from '@/i18n';

interface UseGuestSession {
  ready: boolean; // a guest session exists
  isGuest: boolean; // every player is a guest; adults sign in separately at /account
  ensureSession: () => Promise<void>; // idempotent; call before starting a game
  error: string | null;
}

/** Makes sure there is a guest session before play. Guests never give an email. */
export function useGuestSession(): UseGuestSession {
  const { user, ensureSession: ensure } = useSession();
  const [error, setError] = useState<string | null>(null);

  const ensureSession = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await ensure();
    } catch (err) {
      reportError(err, { area: 'guest-session' });
      setError(t.errors.load.session);
      throw err;
    }
  }, [ensure]);

  return { ready: user !== null, isGuest: true, ensureSession, error };
}
