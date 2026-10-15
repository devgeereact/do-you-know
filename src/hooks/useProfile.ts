import { useCallback, useEffect, useState } from 'react';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { reportError } from '@/lib/sentry';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import {
  assignRandomNickname,
  confirmParentalConsent,
  deleteMyAccount,
  getAvatar,
  getProfile,
  setAgeBand as setAgeBandRpc,
  setNickname as setNicknameRpc,
} from '@/services/profileService';
import type { AgeBand, Profile } from '@/types';

interface UseProfile {
  profile: Profile | null;
  avatarUrl: string | null; // the active avatar once it is ready
  isChild: boolean; // age_band === 'under_13'
  loading: boolean;
  error: string | null;
  setAgeBand: (band: AgeBand) => Promise<boolean>; // once only
  shuffleNickname: () => Promise<string | null>; // generated; kids' only option
  setNickname: (nickname: string) => Promise<boolean>; // 13+ only
  confirmParentalConsent: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}

/** The current player's profile and the protected actions that change it. */
export function useProfile(): UseProfile {
  const { user, loading: authLoading } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!userId) {
      setProfile(null);
      setAvatarUrl(null);
      return;
    }
    const next = await getProfile(userId);
    setProfile(next);
    const active = next?.avatar_id ? await getAvatar(next.avatar_id) : null;
    setAvatarUrl(active?.status === 'ready' ? active.image_url : null);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    reload()
      .catch((err: unknown) => {
        if (active) reportError(err, { area: 'profile:load' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload, authLoading]);

  /** Runs one protected action; maps rule errors to friendly copy. */
  const run = useCallback(
    async <T>(area: string, action: () => Promise<T>): Promise<T | null> => {
      setError(null);
      try {
        const result = await action();
        await reload();
        return result;
      } catch (err) {
        const e = err as { message?: string };
        if (isGameError(e)) {
          setError(gameErrorMessage(e));
        } else {
          reportError(err, { area: `profile:${area}` });
          setError(gameErrorMessage(null));
        }
        return null;
      }
    },
    [reload],
  );

  const setAgeBand = useCallback(
    async (band: AgeBand): Promise<boolean> =>
      (await run('age-band', () => setAgeBandRpc(band).then(() => true))) === true,
    [run],
  );

  const shuffleNickname = useCallback(
    (): Promise<string | null> => run('shuffle', assignRandomNickname),
    [run],
  );

  const setNickname = useCallback(
    async (nickname: string): Promise<boolean> =>
      (await run('nickname', () => setNicknameRpc(nickname))) !== null,
    [run],
  );

  const confirmConsent = useCallback(
    async (): Promise<boolean> =>
      (await run('consent', () => confirmParentalConsent().then(() => true))) === true,
    [run],
  );

  const deleteAccount = useCallback(
    async (): Promise<boolean> =>
      (await run('delete', () => deleteMyAccount().then(() => true))) === true,
    [run],
  );

  return {
    profile,
    avatarUrl,
    isChild: profile?.age_band === 'under_13',
    loading,
    error,
    setAgeBand,
    shuffleNickname,
    setNickname,
    confirmParentalConsent: confirmConsent,
    deleteAccount,
  };
}
