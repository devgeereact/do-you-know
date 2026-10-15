import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { reportError } from '@/lib/sentry';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useInngestDispatch } from '@/hooks/useInngestDispatch';
import { useProfile } from '@/hooks/useProfile';
import {
  getAvatar,
  getAvatarOptions,
  requestAvatar,
  setActiveAvatar,
  type AvatarOptions,
} from '@/services/profileService';
import type { Avatar, AvatarStatus } from '@/types';
import type { AvatarTraits } from '@/types/game';

type TraitKey = keyof AvatarTraits;

interface UseAvatarBuilder {
  traits: AvatarTraits;
  options: Record<TraitKey, string[]>; // filtered (no adult look for kids, facial hair only for adult)
  setTrait: <K extends TraitKey>(key: K, value: AvatarTraits[K]) => void;
  randomise: () => void;
  generate: () => Promise<void>; // request_avatar → Inngest 'avatar/requested'
  status: AvatarStatus | 'idle';
  avatar: Avatar | null; // latest request; polled until ready/failed
  remainingToday: number;
  error: string | null; // e.g. "Someone already has that exact look!"
  useAvatar: () => Promise<boolean>; // set_active_avatar
  ready: boolean; // options loaded
}

export const TRAIT_KEYS: TraitKey[] = [
  'age_look',
  'skin_tone',
  'face_shape',
  'hair_style',
  'hair_colour',
  'eye_colour',
  'outfit',
  'outfit_colour',
  'accessory',
  'facial_hair',
];

const EMPTY_TRAITS: AvatarTraits = {
  age_look: 'child',
  skin_tone: '',
  face_shape: '',
  hair_style: '',
  hair_colour: '',
  eye_colour: '',
  outfit: '',
  outfit_colour: '',
  accessory: 'none',
  facial_hair: 'none',
};

const FINISHED: AvatarStatus[] = ['ready', 'failed', 'rejected'];

/** Apply the house rules the server also enforces, so the picker never offers a refused value. */
function filterOptions(
  all: Record<TraitKey, string[]>,
  traits: AvatarTraits,
  isChild: boolean,
): Record<TraitKey, string[]> {
  const out = { ...all };
  if (isChild) out.age_look = all.age_look.filter((v) => v !== 'adult');
  if (traits.age_look !== 'adult') out.facial_hair = ['none'];
  return out;
}

/** A random item. Trait lists from the server are never empty. */
function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

/**
 * Trait picker + generation status. Allowed values come from the server;
 * uniqueness and the daily limit are enforced server-side. Polling backs off
 * (2 s → 10 s) and pauses while the tab is hidden.
 */
export function useAvatarBuilder(): UseAvatarBuilder {
  const { ensureSession } = useGuestSession();
  const { isChild } = useProfile();
  const { send } = useInngestDispatch();
  const [all, setAll] = useState<AvatarOptions | null>(null);
  const [traits, setTraits] = useState<AvatarTraits>(EMPTY_TRAITS);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [status, setStatus] = useState<AvatarStatus | 'idle'>('idle');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const fail = useCallback((err: unknown, area: string): void => {
    const e = err as { message?: string };
    if (isGameError(e)) {
      setError(gameErrorMessage(e));
    } else {
      reportError(err, { area: `avatar:${area}` });
      setError(gameErrorMessage(null));
    }
  }, []);

  // Load the allowed values and start from the first valid look.
  useEffect(() => {
    let active = true;
    getAvatarOptions()
      .then((opts) => {
        if (!active) return;
        setAll(opts);
        const start = { ...EMPTY_TRAITS };
        for (const key of TRAIT_KEYS) start[key] = opts.traits[key][0] as never;
        setTraits(start);
      })
      .catch((err: unknown) => {
        if (active) fail(err, 'options');
      });
    return () => {
      active = false;
    };
  }, [fail]);

  const options = useMemo(
    () => (all ? filterOptions(all.traits, traits, isChild) : ({} as Record<TraitKey, string[]>)),
    [all, traits, isChild],
  );

  const setTrait = useCallback(<K extends TraitKey>(key: K, value: AvatarTraits[K]): void => {
    setError(null);
    setTraits((prev) => {
      const next = { ...prev, [key]: value };
      // Facial hair only goes with the adult look.
      if (next.age_look !== 'adult') next.facial_hair = 'none';
      return next;
    });
  }, []);

  const randomise = useCallback((): void => {
    if (!all) return;
    setError(null);
    const next = { ...EMPTY_TRAITS };
    const ageLooks = isChild
      ? all.traits.age_look.filter((v) => v !== 'adult')
      : all.traits.age_look;
    next.age_look = pick(ageLooks) as AvatarTraits['age_look'];
    for (const key of TRAIT_KEYS) {
      if (key === 'age_look') continue;
      next[key] = pick(all.traits[key]) as never;
    }
    if (next.age_look !== 'adult') next.facial_hair = 'none';
    setTraits(next);
  }, [all, isChild]);

  // Poll the latest avatar until it finishes; pause while the tab is hidden.
  useEffect(() => {
    if (!avatar || FINISHED.includes(avatar.status)) return;
    let delay = 2000;
    let stopped = false;
    const tick = async (): Promise<void> => {
      if (stopped) return;
      if (document.visibilityState === 'visible') {
        try {
          const fresh = await getAvatar(avatar.id);
          if (stopped || !fresh) return;
          setStatus(fresh.status);
          if (FINISHED.includes(fresh.status)) {
            setAvatar(fresh);
            return;
          }
        } catch (err) {
          reportError(err, { area: 'avatar:poll' });
        }
      }
      delay = Math.min(delay * 1.5, 10000);
      pollRef.current = window.setTimeout(() => void tick(), delay);
    };
    pollRef.current = window.setTimeout(() => void tick(), delay);
    return () => {
      stopped = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [avatar]);

  const generate = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await ensureSession();
      const { avatar_id: avatarId } = await requestAvatar(traits);
      setAll((prev) => (prev ? { ...prev, used_today: prev.used_today + 1 } : prev));
      setStatus('pending');
      setAvatar(await getAvatar(avatarId));
      // Fire-and-forget: the job re-checks the row is still pending.
      void send('avatar/requested', { avatar_id: avatarId });
    } catch (err) {
      fail(err, 'generate');
    }
  }, [ensureSession, traits, send, fail]);

  const useAvatar = useCallback(async (): Promise<boolean> => {
    if (!avatar) return false;
    try {
      await setActiveAvatar(avatar.id);
      return true;
    } catch (err) {
      fail(err, 'use');
      return false;
    }
  }, [avatar, fail]);

  return {
    traits,
    options,
    setTrait,
    randomise,
    generate,
    status,
    avatar,
    remainingToday: all ? Math.max(0, all.daily_limit - all.used_today) : 0,
    error,
    useAvatar,
    ready: all !== null,
  };
}
