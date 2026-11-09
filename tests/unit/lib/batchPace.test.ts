import { describe, expect, it } from 'vitest';
import { dayLabel, paceFinish } from '@/lib/batchPace';

describe('how long a paced publish takes', () => {
  it('puts everything live today when the pace is "all now"', () => {
    expect(paceFinish(56, 0, '2026-11-09')).toEqual({ days: 1, last: '2026-11-09' });
  });

  it('counts whole days, the first being today', () => {
    expect(paceFinish(56, 5, '2026-11-09')).toEqual({ days: 12, last: '2026-11-20' });
    expect(paceFinish(10, 5, '2026-11-09')).toEqual({ days: 2, last: '2026-11-10' });
    expect(paceFinish(1, 5, '2026-11-09')).toEqual({ days: 1, last: '2026-11-09' });
  });

  it('runs across a month end and a clock change', () => {
    expect(paceFinish(6, 1, '2026-10-28')).toEqual({ days: 6, last: '2026-11-02' });
  });

  it('has nothing to do for an empty batch', () => {
    expect(paceFinish(0, 5, '2026-11-09')).toEqual({ days: 0, last: '2026-11-09' });
  });
});

describe('a short day label', () => {
  it('names the weekday, date and month', () => {
    expect(dayLabel('2026-11-20')).toBe('Fri 20 Nov');
  });
});
