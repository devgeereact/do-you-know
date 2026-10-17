import type { Profile } from '@/types';
import type { AnswerResult, AttemptState, AttemptSummary, PublicQuestion } from '@/types/game';

export const question = (id = 'q1', overrides: Partial<PublicQuestion> = {}): PublicQuestion => ({
  id,
  type: 'choice',
  prompt: `Prompt ${id}`,
  image_url: null,
  options: [
    { id: `${id}-a`, label: 'First' },
    { id: `${id}-b`, label: 'Second' },
  ],
  slider: null,
  ...overrides,
});

export const attemptState = (overrides: Partial<AttemptState> = {}): AttemptState => ({
  attempt_id: 'att1',
  mode: 'practice',
  status: 'in_progress',
  quiz: { slug: 'space', title: 'Space' },
  position: 1,
  total: 3,
  answered: 0,
  correct: 0,
  awaiting_next: false,
  complete: false,
  time_limit_seconds: null,
  question: question(),
  server_now: '2026-10-17T10:00:00Z',
  question_deadline: null,
  ...overrides,
});

export const answerResult = (overrides: Partial<AnswerResult> = {}): AnswerResult => ({
  is_correct: true,
  timed_out: false,
  correct_option_ids: ['q1-a'],
  correct_value: null,
  accept_min: null,
  accept_max: null,
  explanation: 'Because.',
  source_url: null,
  position: 1,
  total: 3,
  is_last: false,
  ...overrides,
});

export const summary = (overrides: Partial<AttemptSummary> = {}): AttemptSummary => ({
  attempt_id: 'att1',
  mode: 'practice',
  correct: 2,
  total: 3,
  answer_time_ms: 12_500,
  review: [
    {
      position: 1,
      prompt: 'What is the capital of France?',
      type: 'choice',
      is_correct: true,
      timed_out: false,
      your_answer: 'Paris',
      correct_answer: 'Paris',
      explanation: 'Paris has been the capital for centuries.',
      source_url: null,
      time_ms: 3000,
    },
    {
      position: 2,
      prompt: 'How many legs has a spider?',
      type: 'slider',
      is_correct: false,
      timed_out: false,
      your_answer: 6,
      correct_answer: 8,
      explanation: null,
      source_url: 'https://example.org/spiders',
      time_ms: 4000,
    },
    {
      position: 3,
      prompt: 'Is the sun a star?',
      type: 'boolean',
      is_correct: false,
      timed_out: true,
      your_answer: null,
      correct_answer: 'True',
      explanation: null,
      source_url: 'javascript:alert(1)',
      time_ms: 5500,
    },
  ],
  ranks: {},
  versus: null,
  needs_nickname: false,
  streak: 0,
  ...overrides,
});

export const profile = (overrides: Partial<Profile> = {}): Profile =>
  ({
    id: 'p1',
    role: 'player',
    nickname: null,
    age_band: null,
    avatar_id: null,
    streak_current: 0,
    streak_best: 0,
    last_daily_date: null,
    created_at: '2026-10-17T10:00:00Z',
    updated_at: '2026-10-17T10:00:00Z',
    ...overrides,
  }) as Profile;
