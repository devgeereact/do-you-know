import type {
  ChoiceOption,
  QuestionContent,
  QuestionType,
  SliderSpec,
} from '@/services/adminService';

/**
 * Client mirror of the server's question rules (backend/src/Content.php validateQuestion and
 * validateSlider). It only gives early, friendly hints in DYK Studio; the server stays the source
 * of truth and refuses anything that breaks them.
 */

export const LIMITS = {
  prompt: 300,
  explanation: 400,
  option: 120,
  sourceUrl: 500,
  unit: 20,
  minOptions: 2,
  maxOptions: 6,
  maxSteps: 1000,
  minQuestions: 3,
  maxQuestions: 50,
} as const;

export type FieldKey =
  'prompt' | 'options' | 'answer' | 'slider' | 'explanation' | 'source_url' | 'review_by';

export interface FieldError {
  field: FieldKey;
  message: string;
  /** Allowed in a draft (an import may leave it for later) but needed before publishing. */
  later?: boolean;
}

/** Same pattern as Content.php: an https link on a real-looking host. */
const SOURCE_RE = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s"<>]*)?$/i;
const CONTROL_RE = /[\x00-\x1F\x7F]/; // eslint-disable-line no-control-regex
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Length in code points, as PHP's mb_strlen counts. */
export function textLength(value: string | null | undefined): number {
  return Array.from(value ?? '').length;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidDate(value: string | null | undefined): boolean {
  if (!value || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isSourceUrl(value: string | null | undefined): boolean {
  return !!value && value.length <= LIMITS.sourceUrl && SOURCE_RE.test(value);
}

/**
 * Lower case without spaces, quotes, brackets or sentence punctuation (Content::promptKey), so a
 * reworded copy still counts as a repeat.
 */
export function promptKey(prompt: string): string {
  return prompt.toLowerCase().replace(/[\s.,!?;:'"“”‘’()[\]…]+/gu, '');
}

function sliderErrors(s: SliderSpec | undefined): string[] {
  if (!s) return ['Fill in every slider number'];
  const keys = ['min', 'max', 'step', 'correct', 'accept_min', 'accept_max'] as const;
  if (!keys.every((k) => isNumber(s[k]))) return ['Fill in every slider number'];
  const out: string[] = [];
  if (s.unit && textLength(s.unit) > LIMITS.unit) {
    out.push(`Unit must be ${LIMITS.unit} characters or fewer`);
  }
  if (s.min >= s.max || s.step <= 0) {
    out.push(s.min >= s.max ? 'Minimum must be less than maximum' : 'Step must be more than 0');
    return out;
  }
  const steps = (s.max - s.min) / s.step;
  if (steps > LIMITS.maxSteps || Math.abs(steps - Math.round(steps)) > 1e-9) {
    out.push('The range must divide into at most 1000 whole steps');
  }
  if (!(
    s.min <= s.accept_min &&
    s.accept_min <= s.correct &&
    s.correct <= s.accept_max &&
    s.accept_max <= s.max
  )) {
    out.push('The right answer and its accepted range must sit inside min and max');
  }
  const offset = (s.correct - s.min) / s.step;
  if (Math.abs(offset - Math.round(offset)) > 1e-9) {
    out.push('The right answer must land on a step');
  }
  if (s.accept_max - s.accept_min > (s.max - s.min) / 2) {
    out.push('The accepted range can be at most half the scale');
  }
  return out;
}

/**
 * Problems with one question. Pass `today` (YYYY-MM-DD) to also flag a review-by date that has
 * passed, as the server does before checking and publishing.
 */
export function validateQuestion(
  q: QuestionContent,
  options: { today?: string } = {},
): FieldError[] {
  const e: FieldError[] = [];
  const prompt = q.prompt ?? '';
  if (!prompt.trim()) e.push({ field: 'prompt', message: 'Write the question' });
  else if (textLength(prompt) > LIMITS.prompt) {
    e.push({
      field: 'prompt',
      message: `Question is ${textLength(prompt)} characters. The limit is ${LIMITS.prompt}`,
    });
  } else if (CONTROL_RE.test(prompt)) {
    e.push({ field: 'prompt', message: 'Keep the question on one line' });
  }

  const explanation = q.explanation ?? '';
  if (!explanation.trim()) {
    e.push({
      field: 'explanation',
      message: 'Add an explanation so players learn something',
      later: true,
    });
  } else if (textLength(explanation) > LIMITS.explanation) {
    e.push({
      field: 'explanation',
      message: `Explanation is ${textLength(explanation)} characters. The limit is ${LIMITS.explanation}`,
    });
  } else if (CONTROL_RE.test(explanation)) {
    e.push({ field: 'explanation', message: 'Keep the explanation on one line' });
  }

  const source = (q.source_url ?? '').trim();
  if (!source) e.push({ field: 'source_url', message: 'Add a source link (https)', later: true });
  else if (!isSourceUrl(source)) {
    e.push({ field: 'source_url', message: 'Source must be a full https:// link', later: true });
  }

  if (!isValidDate(q.review_by)) {
    e.push({ field: 'review_by', message: 'Pick a re-check date' });
  } else if (options.today && (q.review_by as string) < options.today) {
    e.push({
      field: 'review_by',
      message: 'The re-check date has passed. Check the fact and pick a new date',
    });
  }

  if (q.type === 'choice') {
    const opts = q.options ?? [];
    if (opts.length < LIMITS.minOptions || opts.length > LIMITS.maxOptions) {
      e.push({ field: 'options', message: 'Choice questions need 2 to 6 answers' });
    }
    if (opts.some((o) => !o.label.trim())) {
      e.push({ field: 'options', message: 'Fill in every answer or remove the empty one' });
    }
    if (opts.some((o) => textLength(o.label) > LIMITS.option)) {
      e.push({ field: 'options', message: 'Each answer must be 120 characters or fewer' });
    }
    if (opts.filter((o) => o.correct).length !== 1) {
      e.push({ field: 'options', message: 'Mark exactly one right answer' });
    }
    const labels = opts.map((o) => o.label.trim().toLowerCase()).filter(Boolean);
    if (new Set(labels).size !== labels.length) {
      e.push({ field: 'options', message: 'Two answers are the same' });
    }
  } else if (q.type === 'boolean') {
    if (typeof q.answer !== 'boolean') e.push({ field: 'answer', message: 'Pick True or False' });
  } else if (q.type === 'slider') {
    for (const message of sliderErrors(q.slider)) e.push({ field: 'slider', message });
  }
  return e;
}

/** Problems that stop a draft question being saved as-is (everything except "later" ones). */
export function blockingErrors(q: QuestionContent, options: { today?: string } = {}): FieldError[] {
  return validateQuestion(q, options).filter((e) => !e.later);
}

// ---- Dates ----

/** Today's date in London (the server's calendar), as YYYY-MM-DD. */
export function londonToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---- Building questions ----

/** A fresh question of a type, with a re-check date a year from today. */
export function blankQuestion(type: QuestionType, today: string): QuestionContent {
  const base = {
    prompt: '',
    explanation: '',
    source_url: '',
    review_by: addDays(today, 365),
    scene: null,
  };
  if (type === 'boolean') return { ...base, type, answer: true };
  if (type === 'slider') {
    return {
      ...base,
      type,
      slider: { min: 0, max: 100, step: 1, unit: '', correct: 50, accept_min: 50, accept_max: 50 },
    };
  }
  const options: ChoiceOption[] = [
    { label: '', correct: true },
    { label: '', correct: false },
    { label: '', correct: false },
    { label: '', correct: false },
  ];
  return { ...base, type: 'choice', options };
}

/** The same question as another type: shared fields stay, the answer part starts fresh. */
export function changeType(q: QuestionContent, type: QuestionType, today: string): QuestionContent {
  if (q.type === type) return q;
  const fresh = blankQuestion(type, today);
  return {
    ...fresh,
    ...(q.id ? { id: q.id } : {}),
    prompt: q.prompt,
    explanation: q.explanation,
    source_url: q.source_url,
    review_by: q.review_by,
    scene: q.scene ?? null,
  };
}

/**
 * Exactly the content-file keys the server stores for a question: only the answer part that
 * matches the type, empty optional text as null, and no server-owned fields.
 */
export function toContent(q: QuestionContent): QuestionContent {
  const out: QuestionContent = {
    ...(q.id ? { id: q.id } : {}),
    type: q.type,
    prompt: q.prompt.trim(),
    explanation: q.explanation?.trim() ? q.explanation.trim() : null,
    source_url: q.source_url?.trim() ? q.source_url.trim() : null,
    review_by: q.review_by || null,
    scene: q.scene ?? null,
  };
  if (q.type === 'choice') {
    out.options = (q.options ?? []).map((o) => ({ label: o.label.trim(), correct: o.correct }));
  } else if (q.type === 'boolean') {
    out.answer = q.answer;
  } else if (q.slider) {
    out.slider = { ...q.slider, unit: q.slider.unit?.trim() ? q.slider.unit.trim() : null };
  }
  return out;
}

/** Human text for the marked answer (Check & publish, import preview). */
export function markedAnswer(q: QuestionContent): string {
  if (q.type === 'choice') return q.options?.find((o) => o.correct)?.label ?? 'None marked';
  if (q.type === 'boolean') {
    return q.answer === true ? 'True' : q.answer === false ? 'False' : 'None marked';
  }
  const s = q.slider;
  if (!s) return 'None marked';
  const unit = s.unit ? ` ${s.unit}` : '';
  return s.accept_min === s.accept_max
    ? `${s.correct}${unit}`
    : `${s.correct}${unit} (accepts ${s.accept_min} to ${s.accept_max})`;
}
