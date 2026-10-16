import { useEffect, useRef, useState } from 'react';

interface UseQuestionTimer {
  secondsLeft: number | null; // null when the quiz has no timer
  isLow: boolean; // ≤ 5 s (switch to warning token + aria-live)
}

/**
 * Display-only countdown. The server decides time-outs; this only shows the
 * seconds left and fires a callback once at zero.
 */
export function useQuestionTimer(
  limitSeconds: number | null,
  questionKey: string | null,
  onExpire?: () => void,
  clock?: { deadline?: string | null; serverNow?: string },
): UseQuestionTimer {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(limitSeconds);
  const expireRef = useRef(onExpire);
  const expiredQuestionRef = useRef<string | null>(null);
  expireRef.current = onExpire;
  const deadline = clock?.deadline;
  const serverNow = clock?.serverNow;

  useEffect(() => {
    if (limitSeconds === null || questionKey === null) {
      expiredQuestionRef.current = null;
      setSecondsLeft(null);
      return;
    }
    const remaining = deadline && serverNow ? Date.parse(deadline) - Date.parse(serverNow) : NaN;
    const endsAt = Date.now() + (Number.isFinite(remaining) ? Math.max(0, remaining) : limitSeconds * 1000);
    let fired = false;
    const expiryKey = `${questionKey}:${deadline ?? ''}`;
    let id: number | undefined;
    const tick = (): void => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        if (expiredQuestionRef.current !== expiryKey) {
          expiredQuestionRef.current = expiryKey;
          expireRef.current?.();
        }
      }
    };
    tick();
    if (!fired) id = window.setInterval(tick, 250);

    return () => window.clearInterval(id);
  }, [limitSeconds, questionKey, deadline, serverNow]);

  return { secondsLeft, isLow: secondsLeft !== null && secondsLeft <= 5 };
}
