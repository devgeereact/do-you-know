import { describe, expect, it } from 'vitest';
import cases from '../../../backend/tests/fixtures/house-rules-cases.json';
import { houseWarnings, questionWarnings } from '@/lib/houseRules';

// The same cases backend/tests/houserules.php runs, so the two implementations cannot drift apart.
describe('house rules agree with the server', () => {
  for (const c of cases as {
    name: string;
    quiz: Parameters<typeof houseWarnings>[0];
    expect: string[];
  }[]) {
    it(c.name, () => {
      const got = houseWarnings(c.quiz).map((w) => `${w.code}@${w.index ?? 'quiz'}`);
      expect(got).toEqual(c.expect);
    });
  }
});

describe('a single question, for the import preview', () => {
  const q = {
    type: 'choice' as const,
    prompt: 'What color is the sky?',
    explanation: 'Blue.',
    options: [
      { label: 'blue', correct: true },
      { label: 'red', correct: false },
    ],
  };
  it('names the UK spelling', () => {
    const w = questionWarnings(q, false, 0);
    expect(w).toHaveLength(1);
    expect(w[0]?.message).toContain('colour');
  });
  it('checks faith words only for the religious subject', () => {
    const faith = { ...q, prompt: 'Which holy book do Muslims read?' };
    expect(questionWarnings(faith, false, 0)).toEqual([]);
    expect(questionWarnings(faith, true, 0).map((x) => x.code)).toEqual(['other_faith']);
  });
});
