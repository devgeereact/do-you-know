import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuestionTimer } from '@/hooks/useQuestionTimer';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useQuestionTimer', () => {
  it('is null without a time limit', () => {
    const { result } = renderHook(() => useQuestionTimer(null, 'q1'));
    expect(result.current).toEqual({ secondsLeft: null, isLow: false });
  });

  it('counts down and flags the last five seconds as low', () => {
    const { result } = renderHook(() => useQuestionTimer(10, 'q1'));
    expect(result.current.secondsLeft).toBe(10);
    expect(result.current.isLow).toBe(false);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.secondsLeft).toBe(5);
    expect(result.current.isLow).toBe(true);
  });

  it('fires onExpire exactly once at zero', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useQuestionTimer(2, 'q1', onExpire));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('uses the server deadline rather than the full limit when one is given', () => {
    const { result } = renderHook(() =>
      useQuestionTimer(20, 'q1', undefined, {
        deadline: '2026-10-17T10:00:07Z',
        serverNow: '2026-10-17T10:00:00Z',
      }),
    );
    expect(result.current.secondsLeft).toBe(7);
  });

  it('stops when the question is cleared', () => {
    const { result, rerender } = renderHook(({ key }) => useQuestionTimer(10, key), {
      initialProps: { key: 'q1' as string | null },
    });
    expect(result.current.secondsLeft).toBe(10);
    rerender({ key: null });
    expect(result.current.secondsLeft).toBeNull();
  });
});
