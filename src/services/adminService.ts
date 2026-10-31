import { ApiError } from '@/lib/api';
import { env } from '@/lib/env';
import type { WorldKey } from '@/lib/art';

/**
 * Staff calls for DYK Studio. Every one carries a Clerk session token and is checked again on the
 * server against the private admin allowlist; nothing here decides who is an admin. The server
 * owns every rule (validation, checks, publishing); the Studio only mirrors the rules for hints.
 *
 * Requests go through `adminRequest` rather than `api()` because Studio screens need the 422
 * `details` list (field problems per question), which `api()` does not keep.
 */
export type GetToken = () => Promise<string | null>;

/** One field problem from a 422 reply or a quiz's `problems` list. */
export interface Problem {
  index?: number | null;
  field: string;
  message: string;
}

/** An ApiError that also keeps the server's `details` (a problem list or an object). */
export class AdminApiError extends ApiError {
  constructor(
    code: string,
    status: number,
    readonly details: unknown = null,
  ) {
    super(code, status);
    this.name = 'AdminApiError';
  }

  /** The details as a problem list (empty when the server sent an object or nothing). */
  get problems(): Problem[] {
    if (!Array.isArray(this.details)) return [];
    return this.details.filter(
      (d): d is Problem =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as Problem).field === 'string' &&
        typeof (d as Problem).message === 'string',
    );
  }
}

type Query = Record<string, string | number | undefined | null>;

async function adminRequest<T>(
  getToken: GetToken,
  path: string,
  options: { body?: unknown; query?: Query } = {},
): Promise<T> {
  const authToken = await getToken();
  if (!authToken) throw new AdminApiError('not_signed_in', 401);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  const url = `${env.apiUrl.replace(/\/$/, '')}${path}${search ? `?${search}` : ''}`;
  const post = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(url, {
      method: post ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
        ...(post ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(post ? { body: JSON.stringify(options.body) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new AdminApiError('network_error', 0);
  }
  const data = (await response.json().catch(() => null)) as
    (T & { error?: { code?: string; details?: unknown } }) | null;
  if (!response.ok) {
    throw new AdminApiError(
      data?.error?.code ?? 'request_failed',
      response.status,
      data?.error?.details ?? null,
    );
  }
  return data as T;
}

// ---- Shapes (see backend/src/AdminContent.php, AdminOps.php, Feedback.php) ----

export interface AuditEntry {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  at: string;
}

export type QuizStatus = 'draft' | 'review' | 'published' | 'retired';
export type KeyStage = 'KS1' | 'KS2' | 'KS3' | 'KS4';
export const KEY_STAGES: readonly KeyStage[] = ['KS1', 'KS2', 'KS3', 'KS4'];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'choice' | 'boolean' | 'slider';

export interface ChoiceOption {
  label: string;
  correct: boolean;
}

export interface SliderSpec {
  min: number;
  max: number;
  step: number;
  unit: string | null;
  correct: number;
  accept_min: number;
  accept_max: number;
}

/** A question in the server's content shape (what the Studio sends). */
export interface QuestionContent {
  id?: string;
  type: QuestionType;
  prompt: string;
  options?: ChoiceOption[];
  answer?: boolean;
  slider?: SliderSpec;
  explanation: string | null;
  source_url: string | null;
  review_by: string | null;
  scene?: WorldKey | null;
}

/** A work-copy question as the server returns it. */
export interface StudioQuestion extends QuestionContent {
  id: string;
  checked: boolean;
  scene_default: WorldKey;
  stats: { answered: number; right: number };
}

export interface QuizInfo {
  id: string;
  slug: string;
  status: QuizStatus;
  in_review: boolean;
  has_draft: boolean;
  version: number | null;
  live: boolean;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
  title: string | null;
  intro: string | null;
  category: string | null;
  difficulty: Difficulty | null;
  age_min: number | null;
  age_max: number | null;
  curriculum_tags: string[];
  time_limit_seconds: number | null;
  shuffle_options: boolean | null;
  is_ranked: boolean | null;
  round_size: number | null;
  category_name: string | null;
  ks: KeyStage | null;
}

export interface QuizVersion {
  version: number;
  created_at: string;
  question_count: number;
  live: boolean;
}

export interface QuizDetail {
  quiz: QuizInfo;
  questions: StudioQuestion[];
  versions: QuizVersion[];
  problems: Problem[];
}

export interface QuizListItem {
  id: string;
  slug: string;
  title: string;
  category: { slug: string; name: string } | null;
  ks: KeyStage | null;
  status: QuizStatus;
  in_review: boolean;
  version: number | null;
  question_count: number;
  plays: number;
  right_rate: number | null;
  updated_at: string;
  publish_at: string | null;
  has_draft: boolean;
}

/** Meta keys accepted by POST /admin/quizzes/{id} (merged into the work copy). */
export interface QuizMetaPatch {
  title?: string;
  intro?: string;
  category?: string;
  ks?: KeyStage | null;
  difficulty?: Difficulty;
  time_limit_seconds?: number | null;
}

export interface NewQuiz {
  title: string;
  category: string;
  ks?: KeyStage | null;
  intro?: string;
  difficulty?: Difficulty;
  time_limit_seconds?: number | null;
  questions?: QuestionContent[];
}

export type TodoKey =
  | 'feedback_new'
  | 'review_questions'
  | 'draft_problems'
  | 'review_due'
  | 'hard_questions'
  | 'daily_gaps';

export interface TodoItem {
  key: TodoKey;
  count: number;
  label: string;
}

export interface Stats {
  plays: { today: number; d7: number; d30: number };
  finish_rate_7d: number | null;
  new_guests_7d: number;
  modes_7d: { practice: number; ranked: number; daily: number; challenge: number };
  top_quizzes_7d: { slug: string; title: string; plays: number }[];
  hardest: {
    quiz_slug: string;
    quiz_title: string;
    question_id: string;
    prompt: string;
    answered: number;
    right_rate: number;
  }[];
}

export type DailyStatus = 'scheduled' | 'live' | 'done' | 'auto' | 'none';

export interface DailyDay {
  date: string;
  quiz_id: string | null;
  slug: string | null;
  title: string | null;
  status: DailyStatus;
}

export interface DailyMonth {
  month: string;
  today: string;
  days: DailyDay[];
}

export interface RoundItem {
  id: string;
  nickname: string | null;
  avatar_id: string | null;
  quiz_title: string;
  correct: number;
  total: number;
  ms: number;
  finished_at: string;
  mode: string;
  hidden: boolean;
}

export type SubjectKind = 'general' | 'school';

export interface Subject {
  slug: string;
  name: string;
  description: string | null;
  kind: SubjectKind;
  scene: WorldKey | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  live_quizzes: number;
  quizzes: number;
}

export interface SubjectPatch {
  name?: string;
  kind?: SubjectKind;
  scene?: WorldKey | null;
  icon?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export type GeneratorAges = '5-7' | '7-11' | '11-14' | '14-16' | '16+';
export type GeneratorStage = 'search' | 'fetch' | 'draft' | 'check' | 'done' | 'failed';
export type DraftDecision = 'pending' | 'approved' | 'rejected' | 'sent';

export interface GeneratorUsage {
  search_calls: number;
  page_calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface GeneratorRunSummary {
  id: string;
  topic: string;
  category: string | null;
  ages: GeneratorAges;
  wanted: number;
  model: string;
  stage: GeneratorStage;
  error: string | null;
  usage: GeneratorUsage;
  created_at: string;
}

export interface GeneratorRunListItem extends GeneratorRunSummary {
  drafts: number;
}

export interface GeneratorSource {
  url: string;
  title: string;
  domain: string;
  state: 'waiting' | 'read' | 'unreadable';
}

export interface GeneratorDraft {
  id: string;
  position: number;
  question: QuestionContent;
  quote: string;
  checks: { quote_found: boolean; on_allowlist: boolean; new_prompt: boolean };
  problems: { field: string; message: string }[];
  kept: boolean;
  decision: DraftDecision;
  sent_quiz_id: string | null;
}

export interface GeneratorRun extends GeneratorRunSummary {
  sources: GeneratorSource[];
  drafts: GeneratorDraft[];
  /** True when another request is already working on this step. */
  busy?: boolean;
}

export interface GeneratorStatus {
  enabled: boolean;
  configured: { claude: boolean; bright_data: boolean };
  ready: boolean;
  model: string;
  sources: string[];
  ages: GeneratorAges[];
  cap: { used: number; limit: number };
  usage_30d: GeneratorUsage & { runs: number; drafts: number; sent: number };
  runs: GeneratorRunListItem[];
}

export type FeedbackType = 'feedback' | 'question' | 'idea' | 'problem';
export type FeedbackStatus = 'new' | 'open' | 'resolved';

export interface FeedbackItem {
  id: string;
  kind: 'player' | 'adult';
  type: FeedbackType;
  presets: string[];
  message: string | null;
  has_email: boolean;
  quiz: { slug: string; title: string } | null;
  question_id: string | null;
  question_prompt: string | null;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
  messages: number;
}

export interface ThreadMessage {
  id: string;
  kind: 'reply' | 'note' | 'player';
  body: string;
  emailed: boolean;
  author: string | null;
  created_at: string;
}

export interface FeedbackDetail extends FeedbackItem {
  email: string | null;
  thread: ThreadMessage[];
}

// ---- Calls ----

/** Resolves when the signed-in account is an admin; rejects with ApiError 403 otherwise. */
export function getAdminMe(getToken: GetToken): Promise<{ is_admin: true }> {
  return adminRequest(getToken, '/admin/me');
}

export function getAuditLog(getToken: GetToken): Promise<AuditEntry[]> {
  return adminRequest(getToken, '/admin/audit');
}

/** Typed wrappers for every Studio route, bound to one token source. */
export function adminClient(getToken: GetToken) {
  const get = <T>(path: string, query?: Query): Promise<T> =>
    adminRequest<T>(getToken, path, { query });
  // Admin action routes accept an empty body; always send an object.
  const post = <T>(path: string, body: unknown = {}): Promise<T> =>
    adminRequest<T>(getToken, path, { body });
  const quiz = (id: string): string => `/admin/quizzes/${encodeURIComponent(id)}`;
  return {
    me: () => getAdminMe(getToken),
    audit: () => getAuditLog(getToken),
    todo: () => get<{ items: TodoItem[] }>('/admin/todo').then((r) => r.items),
    stats: () => get<Stats>('/admin/stats'),

    quizzes: (filter: { status?: QuizStatus; category?: string; ks?: KeyStage; q?: string } = {}) =>
      get<{ items: QuizListItem[] }>('/admin/quizzes', filter).then((r) => r.items),
    quiz: (id: string) => get<QuizDetail>(quiz(id)),
    createQuiz: (body: NewQuiz) => post<{ id: string; slug: string }>('/admin/quizzes', body),
    saveQuiz: (id: string, body: { meta?: QuizMetaPatch; questions?: QuestionContent[] }) =>
      post<QuizDetail>(quiz(id), body),
    append: (id: string, questions: QuestionContent[]) =>
      post<QuizDetail>(`${quiz(id)}/append`, { questions }),
    submit: (id: string) => post<QuizDetail>(`${quiz(id)}/submit`),
    unsubmit: (id: string) => post<QuizDetail>(`${quiz(id)}/unsubmit`),
    check: (id: string, index: number, checked: boolean) =>
      post<QuizDetail>(`${quiz(id)}/check`, { index, checked }),
    publish: (id: string, publishAt?: string | null) =>
      post<QuizDetail>(`${quiz(id)}/publish`, publishAt ? { publish_at: publishAt } : {}),
    retire: (id: string) => post<QuizDetail>(`${quiz(id)}/retire`),
    restore: (id: string) => post<QuizDetail>(`${quiz(id)}/restore`),
    discard: (id: string) => post<QuizDetail>(`${quiz(id)}/discard`),

    daily: (month?: string) => get<DailyMonth>('/admin/daily', { month }),
    setDaily: (date: string, quizId: string | null) =>
      post<DailyDay>('/admin/daily', { date, quiz_id: quizId }),

    rounds: (filter: { q?: string; hidden?: boolean; limit?: number } = {}) =>
      get<{ items: RoundItem[] }>('/admin/rounds', {
        q: filter.q,
        hidden: filter.hidden === undefined ? undefined : filter.hidden ? '1' : '0',
        limit: filter.limit,
      }).then((r) => r.items),
    hideRound: (id: string, hidden: boolean) =>
      post<{ id: string; hidden: boolean; entries: number }>(
        `/admin/rounds/${encodeURIComponent(id)}/hide`,
        { hidden },
      ),

    subjects: () => get<{ items: Subject[] }>('/admin/subjects').then((r) => r.items),
    createSubject: (body: {
      name: string;
      kind: SubjectKind;
      scene?: WorldKey | null;
      icon?: string | null;
      description?: string | null;
    }) => post<Subject>('/admin/subjects', body),
    updateSubject: (slug: string, body: SubjectPatch) =>
      post<Subject>(`/admin/subjects/${encodeURIComponent(slug)}`, body),

    generator: () => get<GeneratorStatus>('/admin/generator'),
    startRun: (body: { topic: string; ages: GeneratorAges; count: number; category?: string }) =>
      post<GeneratorRun>('/admin/generator/runs', body),
    run: (id: string) => get<GeneratorRun>(`/admin/generator/runs/${encodeURIComponent(id)}`),
    stepRun: (id: string) =>
      post<GeneratorRun>(`/admin/generator/runs/${encodeURIComponent(id)}/step`),
    decideDraft: (id: string, decision: 'approved' | 'rejected' | 'pending') =>
      post<GeneratorDraft>(`/admin/generator/drafts/${encodeURIComponent(id)}`, { decision }),
    sendDrafts: (runId: string, quizId: string, draftIds: string[]) =>
      post<{ sent: number; run: GeneratorRun }>(
        `/admin/generator/runs/${encodeURIComponent(runId)}/send`,
        { quiz_id: quizId, draft_ids: draftIds },
      ),

    feedback: (filter: { status?: FeedbackStatus; type?: FeedbackType; limit?: number } = {}) =>
      get<{ items: FeedbackItem[] }>('/admin/feedback', filter).then((r) => r.items),
    feedbackItem: (id: string) => get<FeedbackDetail>(`/admin/feedback/${encodeURIComponent(id)}`),
    reply: (id: string, body: string) =>
      post<{ id: string; emailed: boolean; status: FeedbackStatus }>(
        `/admin/feedback/${encodeURIComponent(id)}/reply`,
        { body },
      ),
    note: (id: string, body: string) =>
      post<{ id: string }>(`/admin/feedback/${encodeURIComponent(id)}/note`, { body }),
    setFeedbackStatus: (id: string, status: FeedbackStatus) =>
      post<{ status: FeedbackStatus }>(`/admin/feedback/${encodeURIComponent(id)}/status`, {
        status,
      }),
  };
}

export type AdminClient = ReturnType<typeof adminClient>;

const MESSAGES: Record<string, string> = {
  network_error: 'Can’t reach the server. Check your connection and try again.',
  generator_off:
    'The generator is switched off. It needs the owner’s approval and its keys in the server settings.',
  generator_daily_cap: 'Today’s generator runs are used up. Try again tomorrow.',
  draft_has_problems: 'Fix the problems on this draft before approving it.',
  drafts_not_approved: 'Only approved drafts can be sent.',
  draft_already_sent: 'That draft has already been sent to a quiz.',
  not_signed_in: 'Your sign-in has run out. Sign in again.',
  forbidden: 'This account can’t use the Studio.',
  rate_limited: 'Too many changes at once. Wait a minute, then try again.',
  quiz_not_found: 'That quiz no longer exists.',
  quiz_retired: 'This quiz is retired. Restore it first.',
  not_retired: 'This quiz isn’t retired.',
  invalid_quiz: 'Check the quiz details.',
  invalid_questions: 'Some questions need fixing.',
  too_many_questions: 'A quiz can have up to 50 questions.',
  invalid_index: 'That question no longer exists. Reload and try again.',
  invalid_publish_at: 'Pick today or a later date.',
  not_enough_questions: 'A quiz needs at least 3 questions.',
  has_problems: 'Fix the problems shown first.',
  unchecked_questions: 'Check every question before publishing.',
  nothing_to_submit: 'There are no edits to send.',
  invalid_month: 'That month can’t be shown.',
  daily_locked: 'That day is already live or done, so it can’t change.',
  invalid_date: 'Pick today or a later day.',
  quiz_not_live: 'Only live quizzes can be the daily.',
  round_not_found: 'That round no longer exists.',
  invalid_hidden: 'That change wasn’t understood.',
  invalid_subject: 'Check the subject details.',
  subject_not_found: 'That subject no longer exists.',
  feedback_not_found: 'That message no longer exists.',
  not_adult_feedback: 'Players can’t receive replies.',
  invalid_body: 'Write between 1 and 5000 characters.',
  invalid_status: 'That status isn’t allowed.',
  invalid_filter: 'That filter isn’t allowed.',
  invalid_limit: 'That filter isn’t allowed.',
  slug_unavailable: 'Pick a different title.',
};

/** Short, friendly copy for any Studio error. */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const base = MESSAGES[error.code] ?? 'Something went wrong. Try again.';
    if (error instanceof AdminApiError && error.code === 'too_many_questions') {
      const d = error.details as { max?: number; have?: number } | null;
      if (d && typeof d.have === 'number' && typeof d.max === 'number') {
        return `This quiz has ${d.have} questions; the most is ${d.max}.`;
      }
    }
    return base;
  }
  return 'Something went wrong. Try again.';
}
