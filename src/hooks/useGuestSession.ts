import { useCallback, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { ensureGuestSession } from '@/services/authService';
import { reportError } from '@/lib/sentry';
import { copy } from '@/lib/copy';

interface UseGuestSession {
  ready: boolean;
  isGuest: boolean;
  error: string | null;
  ensureSession: () => Promise<void>;
}
export function useGuestSession(): UseGuestSession {
  const { user } = useSupabaseAuth();
  const [error, setError] = useState<string | null>(null);
  const ensureSession = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await ensureGuestSession();
    } catch (cause) {
      reportError(cause, { feature: 'guest-session' });
      setError(copy.game.sessionError);
      throw cause;
    }
  }, []);
  return { ready: user !== null, isGuest: user?.is_anonymous === true, error, ensureSession };
}
