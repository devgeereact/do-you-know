import { describe, expect, it } from 'vitest';
import { AGE_BANDS, suitsAge } from '@/lib/ageBands';

describe('age bands', () => {
  it('follows the spec bands with one representative age each', () => {
    expect(AGE_BANDS.map((band) => band.age)).toEqual([7, 10, 13, 15, 18]);
  });

  it('matches a quiz whose age range contains the age, open ends included', () => {
    expect(suitsAge({ age_min: 5, age_max: 7 }, 7)).toBe(true);
    expect(suitsAge({ age_min: 5, age_max: 7 }, 10)).toBe(false);
    expect(suitsAge({ age_min: 14, age_max: 16 }, 15)).toBe(true);
    expect(suitsAge({ age_min: 16, age_max: null }, 18)).toBe(true);
    expect(suitsAge({ age_min: 16, age_max: null }, 13)).toBe(false);
    expect(suitsAge({ age_min: null, age_max: null }, 7)).toBe(true);
  });
});
