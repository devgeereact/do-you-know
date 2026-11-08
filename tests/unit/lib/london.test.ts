import { describe, expect, it } from 'vitest';
import { addDays, londonDaysAgo, londonToday } from '@/lib/london';
import { londonToday as fromGameService } from '@/services/gameService';
import { londonToday as fromAdmin } from '@/lib/adminValidation';

describe('londonToday', () => {
  it('uses GMT in winter', () => {
    expect(londonToday(new Date('2026-12-31T23:30:00Z'))).toBe('2026-12-31');
    expect(londonToday(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01-01');
  });

  it('moves to the next day an hour earlier in British Summer Time', () => {
    expect(londonToday(new Date('2026-07-31T23:30:00Z'))).toBe('2026-08-01');
    expect(londonToday(new Date('2026-07-31T22:59:00Z'))).toBe('2026-07-31');
  });

  it('is one shared helper: the service and the Studio re-use it, not their own copy', () => {
    expect(fromGameService).toBe(londonToday);
    expect(fromAdmin).toBe(londonToday);
  });
});

describe('earlier London days', () => {
  it('goes back one calendar day, not 24 hours, when the clocks go forward', () => {
    // 00:30 BST on 29 March 2027: 24 hours earlier is still the 27th in London.
    const now = new Date('2027-03-28T23:30:00Z');
    expect(londonToday(now)).toBe('2027-03-29');
    expect(londonDaysAgo(1, now)).toBe('2027-03-28');
  });

  it('goes back one calendar day when the clocks go back', () => {
    // 23:30 GMT on 31 October 2027, the day the clocks went back.
    const now = new Date('2027-10-31T23:30:00Z');
    expect(londonToday(now)).toBe('2027-10-31');
    expect(londonDaysAgo(1, now)).toBe('2027-10-30');
  });

  it('gives seven distinct, consecutive days across a clock change', () => {
    const now = new Date('2027-03-29T10:00:00Z');
    const days = Array.from({ length: 7 }, (_, i) => londonDaysAgo(6 - i, now));
    expect(days).toEqual([
      '2027-03-23',
      '2027-03-24',
      '2027-03-25',
      '2027-03-26',
      '2027-03-27',
      '2027-03-28',
      '2027-03-29',
    ]);
  });

  it('adds days to a date string across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });
});
