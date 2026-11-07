import type {
  AssignSpec,
  BuildSpec,
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
  | 'prompt'
  | 'options'
  | 'answer'
  | 'slider'
  | 'build'
  | 'assign'
  | 'explanation'
  | 'source_url'
  | 'review_by';

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

/** A tile or item label: plain text, 1 to 24 characters, no control characters (Content::tileLabel). */
const TILE_LABEL_MAX = 24;
function labelOk(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() !== '' &&
    textLength(value.trim()) <= TILE_LABEL_MAX &&
    !CONTROL_RE.test(value)
  );
}
const norm = (label: string): string => label.trim().toLowerCase();

/** Problems with a tile question (spell, gap, order). Mirrors Content::validateBuild. */
function buildErrors(b: BuildSpec | undefined): string[] {
  if (!b) return ['Fill in the tiles and the right answer'];
  const e: string[] = [];
  if (!['spell', 'gap', 'order'].includes(b.variant)) return ['Pick spell, fill the gap or order'];
  const tiles = b.tiles ?? [];
  if (tiles.length < 2 || tiles.length > 20) return ['Use 2 to 20 tiles'];
  if (!tiles.every(labelOk)) {
    return [`Every tile needs a label of up to ${TILE_LABEL_MAX} characters`];
  }
  const answers = b.answers ?? [];
  if (answers.length < 1 || answers.length > 4) return ['Give 1 to 4 right answers'];
  let slots: number | null = null;
  const seen = new Set<string>();
  const available = new Map<string, number>();
  for (const t of tiles) available.set(norm(t), (available.get(norm(t)) ?? 0) + 1);
  for (const answer of answers) {
    if (answer.length < 1 || answer.length > 12) return ['Each right answer is 1 to 12 tiles'];
    slots ??= answer.length;
    if (answer.length !== slots) e.push('Every right answer must use the same number of tiles');
    if (!answer.every(labelOk)) {
      return [`Every answer tile needs a label of up to ${TILE_LABEL_MAX} characters`];
    }
    const need = new Map<string, number>();
    for (const label of answer) need.set(norm(label), (need.get(norm(label)) ?? 0) + 1);
    for (const [key, n] of need) {
      if ((available.get(key) ?? 0) < n) {
        e.push(`A right answer needs the tile “${key}” more often than the tiles provide`);
        break;
      }
    }
    const fingerprint = answer.map(norm).join('\u001f');
    if (seen.has(fingerprint)) e.push('The same right answer is listed twice');
    seen.add(fingerprint);
  }
  if (b.variant === 'spell' && tiles.some((t) => textLength(t.trim()) !== 1)) {
    e.push('Spelling tiles are single letters');
  }
  if (b.variant === 'order' && (tiles.length !== slots || available.size !== tiles.length)) {
    e.push('Order uses every card exactly once, with no extras and no repeats');
  }
  if (b.variant === 'gap') {
    const gaps = (b.template ?? '').split('___').length - 1;
    if (!(b.template ?? '').trim() || textLength(b.template) > 200 || gaps !== slots) {
      e.push('A gap question needs a sentence with one ___ for each word in the answer');
    }
  } else if (b.template !== undefined) {
    e.push('Only a gap question has a sentence');
  }
  if (b.speak !== undefined) {
    if (b.variant !== 'spell') e.push('Only a spelling question can be read aloud');
    else if (norm(b.speak) !== norm((answers[0] ?? []).join(''))) {
      e.push('The spoken word must be the word being spelled');
    }
  }
  return e;
}

/** Problems with a match or sort question. Mirrors Content::validateAssign. */
function assignErrors(a: AssignSpec | undefined): string[] {
  if (!a) return ['Fill in the things and where they go'];
  if (a.variant !== 'match' && a.variant !== 'sort') return ['Pick match or sort'];
  const match = a.variant === 'match';
  const place = match ? 'partner' : 'group';
  const [tMin, tMax, iMin, iMax] = match ? [2, 5, 2, 5] : [2, 3, 3, 6];
  const targets = a.targets ?? [];
  const items = a.items ?? [];
  if (targets.length < tMin || targets.length > tMax) {
    return [`Use ${tMin} to ${tMax} ${place}s`];
  }
  if (items.length < iMin || items.length > iMax) return [`Use ${iMin} to ${iMax} things`];
  if (!targets.every(labelOk)) {
    return [`Every ${place} needs a name of up to ${TILE_LABEL_MAX} characters`];
  }
  if (!items.every((i) => labelOk(i.label) && labelOk(i.to))) {
    return [`Every thing needs a name and a ${place}, up to ${TILE_LABEL_MAX} characters each`];
  }
  const e: string[] = [];
  const names = new Set(targets.map(norm));
  if (names.size !== targets.length)
    e.push(`${place[0]?.toUpperCase()}${place.slice(1)}s need different names`);
  if (new Set(items.map((i) => norm(i.label))).size !== items.length) {
    e.push('Two things have the same name');
  }
  const used = new Map<string, number>();
  for (const i of items) {
    if (!names.has(norm(i.to)))
      e.push(`“${i.label}” goes to “${i.to}”, which is not one of the ${place}s`);
    else used.set(norm(i.to), (used.get(norm(i.to)) ?? 0) + 1);
  }
  if (match && items.length !== targets.length) e.push('A match has one thing for each partner');
  for (const name of names) {
    const n = used.get(name) ?? 0;
    if (n < 1 || (match && n > 1)) {
      e.push(
        match
          ? `Partner “${name}” needs exactly one thing`
          : `Group “${name}” needs at least one thing`,
      );
      break;
    }
  }
  return e;
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

  // A source is optional (ADR-019); one that is given must be a full https link.
  const source = (q.source_url ?? '').trim();
  if (source && !isSourceUrl(source)) {
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
  } else if (q.type === 'build') {
    for (const message of buildErrors(q.build)) e.push({ field: 'build', message });
  } else if (q.type === 'assign') {
    for (const message of assignErrors(q.assign)) e.push({ field: 'assign', message });
  }
  return e;
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
  if (type === 'build')
    return { ...base, type, build: { variant: 'spell', tiles: [], answers: [[]] } };
  if (type === 'assign') {
    return {
      ...base,
      type,
      assign: {
        variant: 'match',
        targets: ['', ''],
        items: [
          { label: '', to: '' },
          { label: '', to: '' },
        ],
      },
    };
  }
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
  } else if (q.type === 'build' && q.build) {
    const b = q.build;
    out.build = {
      variant: b.variant,
      tiles: b.tiles.map((t) => t.trim()),
      answers: b.answers.map((a) => a.map((t) => t.trim())),
      ...(b.template !== undefined ? { template: b.template.trim() } : {}),
      ...(b.speak !== undefined ? { speak: b.speak.trim() } : {}),
    };
  } else if (q.type === 'assign' && q.assign) {
    out.assign = {
      variant: q.assign.variant,
      targets: q.assign.targets.map((t) => t.trim()),
      items: q.assign.items.map((i) => ({ label: i.label.trim(), to: i.to.trim() })),
    };
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
  if (q.type === 'build') {
    const first = q.build?.answers[0];
    if (!first || first.length === 0) return 'None marked';
    return first.join(q.build?.variant === 'spell' ? '' : ' ');
  }
  if (q.type === 'assign') {
    const items = q.assign?.items ?? [];
    return items.length ? items.map((i) => `${i.label} → ${i.to}`).join('; ') : 'None marked';
  }
  const s = q.slider;
  if (!s) return 'None marked';
  const unit = s.unit ? ` ${s.unit}` : '';
  return s.accept_min === s.accept_max
    ? `${s.correct}${unit}`
    : `${s.correct}${unit} (accepts ${s.accept_min} to ${s.accept_max})`;
}
