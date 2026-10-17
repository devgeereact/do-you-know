/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

  // Read the latest user through a ref so ensureSession keeps one identity. Pages that start a
  // game depend on it, and a new function each time the user loads restarted their game.
  const userRef = useRef(user);
  userRef.current = user;
  const ensureSession = useCallback(async (): Promise<void> => {
    if (hasSession() && userRef.current) return;
    await ensureGuest();
    await load();
    // A stored code that has expired is only discovered by that load (its 401 clears the code),
    // so make a fresh guest once instead of starting the game with no session.
    if (!hasSession()) {
      await ensureGuest();
      await load();
    }
  }, [load]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      ensureSession,
      signOut: async () => {
        await signOutGuest();
        setUser(null);
      },
    }),
    [user, loading, ensureSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
