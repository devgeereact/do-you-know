/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ensureGuest, hasSession, signOutGuest } from '@/lib/api';
import type { Profile } from '@/types';

export interface SessionUser {
  id: string; // the player's profile id on the server
}

export interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  ensureSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

/** The guest session for this browser. Children play without accounts or email. */
export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(hasSession());

  const load = useCallback(async (): Promise<void> => {
    try {
      const me = await api<Profile>('/me');
      setUser({ id: me.id });
    } catch {
      setUser(null); // expired or revoked token; api() already forgot it
    }
  }, []);

  useEffect(() => {
    if (!hasSession()) return;
    void load().finally(() => setLoading(false));
  }, [load]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      ensureSession: async () => {
        if (hasSession() && user) return;
        await ensureGuest();
        await load();
      },
      signOut: async () => {
        await signOutGuest();
        setUser(null);
      },
    }),
    [user, loading, load],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
