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
): UseQuestionTimer {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(limitSeconds);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (limitSeconds === null || questionKey === null) {
      setSecondsLeft(null);
      return;
    }
    const endsAt = Date.now() + limitSeconds * 1000;
    let fired = false;
    setSecondsLeft(limitSeconds);

    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        expireRef.current?.();
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [limitSeconds, questionKey]);

  return { secondsLeft, isLow: secondsLeft !== null && secondsLeft <= 5 };
}
