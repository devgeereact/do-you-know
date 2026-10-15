import { env } from '@/lib/env';
import type { AnswerResult, AttemptState, AttemptSummary } from '@/types/game';

export interface PreviewQuiz {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  question_count: number;
}

const STORAGE_KEY = 'dyk-cpanel-guest';
let token: string | null = null;
let pendingGuest: Promise<void> | null = null;

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${env.cpanelApiUrl.replace(/\/$/, '')}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const data = (await response.json()) as T & { error?: { code?: string } };
  if (!response.ok) throw new Error(data.error?.code || 'request_failed');
  return data;
}

async function ensureGuest(): Promise<void> {
  if (token) return;
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as {
      token?: string;
      expires_at?: string;
    } | null;
    if (stored?.token?.startsWith('guest_') && Date.parse(stored.expires_at || '') > Date.now()) {
      token = stored.token;
      return;
    }
  } catch {
    /* Storage may be unavailable; a guest can still play in memory. */
  }
  const guest = await request<{ token: string; expires_at: string }>('/guest-sessions', {});
  token = guest.token;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(guest));
  } catch {
    /* Optional persistence. */
  }
}

export async function listPreviewQuizzes(): Promise<PreviewQuiz[]> {
  return request<PreviewQuiz[]>('/quizzes');
}

export async function startPreviewQuiz(slug: string): Promise<AttemptState> {
  pendingGuest ??= ensureGuest().finally(() => {
    pendingGuest = null;
  });
  await pendingGuest;
  return request<AttemptState>('/attempts', { quiz_slug: slug, mode: 'practice' });
}

export async function answerPreviewQuestion(
  id: string,
  answer: { option_id: string } | { value: number },
): Promise<AnswerResult> {
  return request<AnswerResult>(`/attempts/${encodeURIComponent(id)}/answer`, answer);
}

export async function nextPreviewQuestion(id: string): Promise<AttemptState> {
  return request<AttemptState>(`/attempts/${encodeURIComponent(id)}/next`, {});
}

export async function finishPreviewQuiz(id: string): Promise<AttemptSummary> {
  return request<AttemptSummary>(`/attempts/${encodeURIComponent(id)}/finish`, {});
}
