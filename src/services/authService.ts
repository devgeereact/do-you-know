import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

let pending: Promise<Session> | null = null;
/** One sign-in for simultaneous Play requests, including React StrictMode. */
export function ensureGuestSession(): Promise<Session> {
  if (pending) return pending;
  pending = (async (): Promise<Session> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session;
    const result = await supabase.auth.signInAnonymously();
    if (result.error) throw result.error;
    if (!result.data.session) throw new Error('not_signed_in');
    return result.data.session;
  })().finally(() => {
    pending = null;
  });
  return pending;
}
