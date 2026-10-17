import { useCallback, useEffect, useState } from 'react';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { reportError } from '@/lib/sentry';
import { useSession } from '@/hooks/useSession';
import {
  assignRandomNickname,
  deleteMyAccount,
  getProfile,
  setAgeBand as setAgeBandApi,
  setAvatar as setAvatarApi,
  setNickname as setNicknameApi,
} from '@/services/profileService';
import type { AgeBand, Profile } from '@/types';

interface UseProfile {
  profile: Profile | null;
  isChild: boolean; // age_band === 'under_13'
  loading: boolean;
  error: string | null;
  setAgeBand: (band: AgeBand) => Promise<boolean>; // once only
  shuffleNickname: () => Promise<string | null>; // generated; kids' only option
  setNickname: (nickname: string) => Promise<boolean>; // 13+ only
  setAvatar: (avatarId: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  refresh: () => Promise<void>; // reload after another component changed the profile
}

/** The current player's profile and the protected actions that change it. */
export function useProfile(): UseProfile {
  const { user, loading: authLoading, signOut } = useSession();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfile(await getProfile());
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
      (await run('age-band', () => setAgeBandApi(band).then(() => true))) === true,
    [run],
  );

  const shuffleNickname = useCallback(
    (): Promise<string | null> => run('shuffle', assignRandomNickname),
    [run],
  );

  const setNickname = useCallback(
    async (nickname: string): Promise<boolean> =>
      (await run('nickname', () => setNicknameApi(nickname))) !== null,
    [run],
  );

  const setAvatar = useCallback(
    async (avatarId: string): Promise<boolean> =>
      (await run('avatar', () => setAvatarApi(avatarId).then(() => true))) === true,
    [run],
  );

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    // No reload afterwards: the profile and its session no longer exist.
    setError(null);
    try {
      await deleteMyAccount();
    } catch (err) {
      reportError(err, { area: 'profile:delete' });
      setError(gameErrorMessage(err as { message?: string }));
      return false;
    }
    setProfile(null);
    await signOut();
    return true;
  }, [signOut]);

  return {
    profile,
    isChild: profile?.age_band === 'under_13',
    loading,
    error,
    setAgeBand,
    shuffleNickname,
    setNickname,
    setAvatar,
    deleteAccount,
    refresh: reload,
  };
}
