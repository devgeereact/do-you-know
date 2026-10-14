import { useEffect, useRef, useState } from 'react';

interface QuestionTiming {
  deadline: string | null;
  serverNow: string;
}
interface UseQuestionTimer {
  secondsLeft: number | null;
  isLow: boolean;
}
/** Display only. Server deadline and monotonic elapsed display survive device clock skew. */
export function useQuestionTimer(
  limitSeconds: number | null,
  questionKey: string | null,
  onExpire?: () => void,
  timing?: QuestionTiming,
): UseQuestionTimer {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  const deadline = timing?.deadline;
  const serverNow = timing?.serverNow;
  useEffect(() => {
    if (limitSeconds === null || questionKey === null) {
      setSecondsLeft(null);
      return;
    }
    const remaining =
      deadline && serverNow
        ? Math.max(0, Date.parse(deadline) - Date.parse(serverNow))
        : limitSeconds * 1000;
    const started = performance.now();
    let notified = false;
    const tick = (): void => {
      const seconds = Math.max(0, Math.ceil((remaining - (performance.now() - started)) / 1000));
      setSecondsLeft(seconds);
      if (seconds === 0 && !notified) {
        notified = true;
        expire.current?.();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [limitSeconds, questionKey, deadline, serverNow]);
  return { secondsLeft, isLow: secondsLeft !== null && secondsLeft <= 5 };
}
