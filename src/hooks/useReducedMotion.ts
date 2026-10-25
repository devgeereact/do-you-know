import { useEffect, useState } from 'react';
import { REDUCED_MOTION } from '@/lib/motion';

/** True while the device asks for less motion. Follows the setting live. */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION).matches,
  );
  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION);
    if (!query) return;
    const onChange = (): void => setReduce(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduce;
}
