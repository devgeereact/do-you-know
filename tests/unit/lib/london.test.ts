import { describe, expect, it } from 'vitest';
import { londonToday } from '@/lib/london';
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
