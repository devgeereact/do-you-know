import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { SessionContext, type SessionContextValue } from '@/context/SessionContext';
import { SWITCHES_OFF, useSwitches } from '@/hooks/useSwitches';

const ctx = (user: SessionContextValue['user']): SessionContextValue => ({
  user,
  loading: false,
  ensureSession: () => Promise.resolve(user),
  signOut: () => Promise.resolve(),
  reload: () => Promise.resolve(),
});
const wrap =
  (value: SessionContextValue) =>
  ({ children }: { children: ReactNode }): JSX.Element => (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );

describe('useSwitches', () => {
  it('is all off with no provider, no player or a guest', () => {
    expect(renderHook(() => useSwitches()).result.current.switches).toEqual(SWITCHES_OFF);
    expect(
      renderHook(() => useSwitches(), { wrapper: wrap(ctx(null)) }).result.current.switches,
    ).toEqual(SWITCHES_OFF);
    expect(
      renderHook(() => useSwitches(), { wrapper: wrap(ctx({ id: 'g' })) }).result.current,
    ).toEqual({ switches: SWITCHES_OFF, level: null });
  });

  it("gives a child the parent's switches and level", () => {
    const user = {
      id: 'c',
      switches: { ...SWITCHES_OFF, public_boards: true, sound: true },
      level: 'explorers' as const,
    };
    const { result } = renderHook(() => useSwitches(), { wrapper: wrap(ctx(user)) });
    expect(result.current.switches.public_boards).toBe(true);
    expect(result.current.switches.beat_clock).toBe(false);
    expect(result.current.level).toBe('explorers');
  });

  it('keeps an unknown or missing switch off', () => {
    const user = { id: 'c', switches: { sound: true } as never };
    const { result } = renderHook(() => useSwitches(), { wrapper: wrap(ctx(user)) });
    expect(result.current.switches.sound).toBe(true);
    expect(result.current.switches.public_boards).toBe(false);
  });
});
