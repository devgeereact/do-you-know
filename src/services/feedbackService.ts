import { api } from '@/lib/api';

export type FeedbackType = 'feedback' | 'question' | 'idea' | 'problem';

export interface FeedbackInput {
  type: FeedbackType;
  /** Ready-made messages. Players can only send these (no free text for children). */
  presets: string[];
  quiz_slug?: string;
  question_id?: string;
  /** Grown-ups only; the server refuses free text from children. */
  message?: string;
  email?: string;
}

/** POST /feedback with the player's own session. */
export function sendFeedback(input: FeedbackInput): Promise<{ id: string }> {
  return api<{ id: string }>('/feedback', { body: input });
}
