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
import { ensureGuest, hasSession, signOutGuest } from '@/lib/api';
import { getProfile } from '@/services/profileService';
import type { ChildLevel, ParentSwitches } from '@/types';

export interface SessionUser {
  id: string; // the player's profile id on the server
  /** For the header menu; refreshed by reload() after the player changes them. */
  nickname?: string | null;
  avatarId?: string | null;
  streak?: number;
  unreadMessages?: number;
  /** What the parent switched on for this player; all off for a guest. */
  switches?: ParentSwitches;
  /** The level a parent set, when this player is a child. */
  level?: ChildLevel | null;
}

export interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  /** Makes sure a session exists and returns the player (their switches say how this game should run). */
  ensureSession: () => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
  /** Reload the header details (nickname, avatar, streak) after a change. */
  reload: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

/** The guest session for this browser. Children play without accounts or email. */
export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(hasSession());

  const load = useCallback(async (): Promise<SessionUser | null> => {
    try {
      const me = await getProfile();
      const next: SessionUser = {
        id: me.id,
        nickname: me.nickname,
        avatarId: me.avatar_id,
        streak: me.streak_current,
        unreadMessages: me.unread_messages ?? 0,
        switches: me.switches,
        level: me.child?.level ?? null,
      };
      setUser(next);
      return next;
    } catch {
      setUser(null); // expired or revoked token; api() already forgot it
      return null;
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
  const ensureSession = useCallback(async (): Promise<SessionUser | null> => {
    if (hasSession() && userRef.current) return userRef.current;
    await ensureGuest();
    let me = await load();
    // A stored code that has expired is only discovered by that load (its 401 clears the code),
    // so make a fresh guest once instead of starting the game with no session.
    if (!hasSession()) {
      await ensureGuest();
      me = await load();
    }
    return me;
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
      reload: async () => {
        if (hasSession()) await load();
      },
    }),
    [user, loading, ensureSession, load],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
