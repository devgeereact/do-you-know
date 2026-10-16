import { useContext } from 'react';
import { SessionContext, type SessionContextValue } from '@/context/SessionContext';

/** The current guest session. Must be used within <SessionProvider>. */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (ctx === null) throw new Error('useSession must be used within a <SessionProvider>.');
  return ctx;
}
