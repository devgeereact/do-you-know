import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/sentry';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface UseGuestSession {
  ready: boolean; // a session (guest or player) exists
  isGuest: boolean; // session.user.is_anonymous
  ensureSession: () => Promise<void>; // idempotent; call before start_attempt
  error: string | null;
}

// One sign-in in flight per tab, however many components ask at once.
let pending: Promise<void> | null = null;

async function signInGuest(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

/** Makes sure there is a session before play. Guests never give an email. */
export function useGuestSession(): UseGuestSession {
  const { session } = useSupabaseAuth();
  const [error, setError] = useState<string | null>(null);

  const ensureSession = useCallback(async (): Promise<void> => {
    setError(null);
    pending ??= signInGuest().finally(() => {
      pending = null;
    });
    try {
      await pending;
    } catch (err) {
      reportError(err, { area: 'guest-session' });
      setError("We couldn't get you ready to play. Check your connection and try again.");
      throw err;
    }
  }, []);

  return {
    ready: session !== null,
    isGuest: session?.user.is_anonymous === true,
    ensureSession,
    error,
  };
}
