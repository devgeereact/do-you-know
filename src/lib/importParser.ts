import {
  addDays,
  blankQuestion,
  promptKey,
  toContent,
  validateQuestion,
} from '@/lib/adminValidation';
import type { KeyStage, QuestionContent } from '@/services/adminService';

/**
 * Turns pasted text or a CSV into draft questions for DYK Studio. Pure: no network, no DOM.
 *
 * Text format (blank line between questions is optional):
 *   # Maths · KS2 · Fractions      sets subject, key stage and topic for what follows
 *   Q: What is half of 18?         or "1." / "Question 3:" starts a question
 *   A) 6  B) 9*  C) 12             options on one line or one per line; * marks the right one
 *   Answer: b                      or name the right option (or true / false)
 *   True* / False                a true-or-false question (star the right one)
 *   Slider: 300-400 = 366 ±0 days  a slider: min-max = right answer, ± accepted band, unit
 *   Why: …                         the explanation
 *   Source: https://…              the source link
 * CSV: a header row with subject, ks, topic, question, a..f, answer, explanation, source.
 *
 * Blocking errors stop a row being imported; missing explanation or source are allowed in a
 * draft and listed as "later". The server checks everything again.
 */

export const MAX_IMPORT_BYTES = 256 * 1024;

export interface ImportSubject {
  slug: string;
  name: string;
  kind?: 'general' | 'school';
}

export interface ImportRow {
  /** 1-based line where the question starts (CSV: the data row's line). */
  line: number;
  /** Existing subject slug (a guess when `guessed`). */
  subject: string;
  guessed: boolean;
  /** A "# Heading" subject that does not exist yet. */
  newSubject: string | null;
  ks: KeyStage | '';
  topic: string;
  q: QuestionContent;
  /** How many answers were marked right. */
  marks: number;
  block: string[];
  later: string[];
}

export interface ImportGroup {
  key: string;
  /** Subject slug, or "new:<name>" for a subject still to create. */
  sid: string;
  ks: KeyStage | '';
  topic: string;
  rows: ImportRow[];
}

/** Keyword guesses, in order; each lists the subject slugs it may map to, best first. */
const KEYWORDS: { re: RegExp; slugs: string[] }[] = [
  {
    re: /\d\s*[×x*÷/+\-=]\s*\d|\b(add|subtract|multiply|divide|fractions?|half|sides?|angles?|shapes?|hexagon|triangle|sum|total|leap year)\b/i,
    slugs: ['maths', 'school-maths', 'math'],
  },
  {
    re: /\b(verbs?|nouns?|adjectives?|adverbs?|sentences?|spell|spelling|capital letter|punctuation|grammar|rhymes?|plural)\b/i,
    slugs: ['school-english', 'english'],
  },
  {
    re: /\b(plants?|gas|oxygen|energy|magnets?|light|sound|cells?|bones?|heart|planets?|animals?|materials?|solid|liquid)\b/i,
    slugs: ['science-nature', 'school-science', 'science'],
  },
  {
    re: /\b(oceans?|rivers?|mountains?|country|countries|continents?|capital|deserts?|maps?|climate|volcano(es)?)\b/i,
    slugs: ['geography', 'school-geography'],
  },
  {
    re: /\b(kings?|queens?|romans?|vikings?|egypt|tudors?|wars?|ancient|century|victorians?)\b/i,
    slugs: ['history', 'school-history'],
  },
  {
    re: /\b(computers?|algorithms?|code|program|internet|binary)\b/i,
    slugs: ['school-computing', 'computing', 'tech'],
  },
  {
    re: /\b(notes?|rhythm|instruments?|beat|orchestra|melody|piano)\b/i,
    slugs: ['music', 'school-music'],
  },
  { re: /\b(french|bonjour|merci)\b/i, slugs: ['french', 'school-french'] },
];

/** Best subject slug for a question's text when no heading names one. */
export function guessSubject(text: string, subjects: ImportSubject[]): string {
  const have = new Set(subjects.map((s) => s.slug));
  for (const { re, slugs } of KEYWORDS) {
    if (!re.test(text)) continue;
    const slug = slugs.find((s) => have.has(s));
    if (slug) return slug;
  }
  if (have.has('general-knowledge')) return 'general-knowledge';
  return subjects[0]?.slug ?? 'general-knowledge';
}

/**
 * An existing subject named by a heading: by name, slug or slug without "school-". When two
 * subjects share a name (Geography and school Geography), a key stage picks the school one.
 */
export function findSubject(
  name: string,
  subjects: ImportSubject[],
  ks: string,
): ImportSubject | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  const matches = subjects.filter(
    (s) => s.name.toLowerCase() === n || s.slug === n || s.slug.replace(/^school-/, '') === n,
  );
  if (matches.length < 2) return matches[0];
  const want = ks ? 'school' : 'general';
  return matches.find((s) => s.kind === want) ?? matches[0];
}

function normaliseKs(value: string): KeyStage | '' {
  const m = value
    .trim()
    .toUpperCase()
    .match(/^KS\s?([1-4])$/);
  return m ? (`KS${m[1]}` as KeyStage) : '';
}

/** Decimal places in a number as written, so 2.5 gets a 0.5-friendly step. */
function decimals(text: string): number {
  const i = text.indexOf('.');
  return i < 0 ? 0 : text.length - i - 1;
}

/** Splits one CSV line, honouring "quoted, fields" and "" escapes. */
export function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
      continue;
    }
    if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** CSV records, joining lines that sit inside a quoted field. */
function csvRecords(lines: string[]): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  let buf: string | null = null;
  let start = 0;
  lines.forEach((l, i) => {
    if (buf === null) {
      buf = l;
      start = i + 1;
    } else buf += `\n${l}`;
    const quotes = (buf.match(/"/g) ?? []).length;
    if (quotes % 2 === 0) {
      out.push({ line: start, text: buf });
      buf = null;
    }
  });
  if (buf !== null) out.push({ line: start, text: buf });
  return out;
}

/** Adds blocking and "later" messages to a parsed row. */
export function finishRow(row: ImportRow): ImportRow {
  row.q.prompt = row.q.prompt.trim();
  const block: string[] = [];
  const later: string[] = [];
  const q = row.q;
  if (q.type === 'choice' && row.marks > 1) block.push('More than one answer is marked right');
  if (q.type === 'choice' && row.marks === 0 && (q.options?.length ?? 0) > 0) {
    block.push('Mark the right answer with * or “Answer: b”');
  }
  if (q.type === 'boolean' && row.marks === 0) block.push('Mark True* or False*');
  for (const err of validateQuestion(q)) {
    if (err.later) later.push(err.message);
    else if (err.field === 'options' && /right answer/.test(err.message) && block.length) continue;
    else if (!block.includes(err.message)) block.push(err.message);
  }
  row.block = block;
  row.later = later;
  return row;
}

/** Flags questions that appear twice in the same file. */
export function markFileDups(rows: ImportRow[]): ImportRow[] {
  const seen = new Map<string, number>();
  for (const r of rows) {
    const key = promptKey(r.q.prompt);
    if (!key) continue;
    const first = seen.get(key);
    if (first !== undefined) r.block.push(`Same as line ${first} in this file`);
    else seen.set(key, r.line);
  }
  return rows;
}

function parseCsv(lines: string[], subjects: ImportSubject[], today: string): ImportRow[] {
  const header = splitCsv(lines[0] ?? '').map((h) => h.toLowerCase().trim());
  const records = csvRecords(lines.slice(1)).filter((r) => r.text.trim());
  return records.map(({ line, text }) => {
    const cells = splitCsv(text);
    const g = (key: string): string => {
      const i = header.indexOf(key);
      return i < 0 ? '' : (cells[i] ?? '').trim();
    };
    const ks = normaliseKs(g('key stage') || g('ks'));
    const subjectName = g('subject');
    const found = findSubject(subjectName, subjects, ks);
    const labels = ['a', 'b', 'c', 'd', 'e', 'f'].map(g).filter(Boolean);
    const answer = g('answer').toLowerCase();
    const prompt = g('question');
    let q: QuestionContent;
    let marks: number;
    if (/^(true|false)$/.test(answer) && labels.length === 0) {
      q = { ...blankQuestion('boolean', today), prompt, answer: answer === 'true' };
      marks = 1;
    } else {
      const right = /^[a-f]$/.test(answer)
        ? 'abcdef'.indexOf(answer)
        : labels.findIndex((o) => o.toLowerCase() === answer);
      q = {
        ...blankQuestion('choice', today),
        prompt,
        options: labels.map((label, k) => ({ label, correct: k === right })),
      };
      marks = right >= 0 && right < labels.length ? 1 : 0;
    }
    q.explanation = g('explanation') || g('why');
    q.source_url = g('source');
    return finishRow({
      line: line + 1,
      subject: found ? found.slug : guessSubject(prompt, subjects),
      guessed: !subjectName,
      newSubject: subjectName && !found ? subjectName : null,
      ks,
      topic: g('topic'),
      q,
      marks,
      block: [],
      later: [],
    });
  });
}

/**
 * Parses pasted text or CSV into rows (with in-file duplicates flagged). `today` (YYYY-MM-DD)
 * sets the default re-check date a year ahead.
 */
export function parseImport(raw: string, subjects: ImportSubject[], today: string): ImportRow[] {
  const lines = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  if (/^\s*"?(subject|question)"?\s*,/i.test(lines[0] ?? '')) {
    return markFileDups(parseCsv(lines, subjects, today));
  }
  const out: ImportRow[] = [];
  let head: {
    subject: string | null;
    newSubject: string | null;
    ks: KeyStage | '';
    topic: string;
  } = { subject: null, newSubject: null, ks: '', topic: '' };
  let cur: ImportRow | null = null;
  const flush = (): void => {
    if (cur) out.push(finishRow(cur));
    cur = null;
  };
  const start = (text: string, line: number): ImportRow => {
    flush();
    const q = blankQuestion('choice', today);
    q.options = [];
    q.prompt = text.trim();
    q.review_by = addDays(today, 365);
    cur = {
      line,
      subject: head.subject ?? guessSubject(text, subjects),
      guessed: !head.subject && !head.newSubject,
      newSubject: head.newSubject,
      ks: head.ks,
      topic: head.topic,
      q,
      marks: 0,
      block: [],
      later: [],
    };
    return cur;
  };

  lines.forEach((rawLine, i) => {
    const line = i + 1;
    const L = rawLine.trim();
    if (!L) return;
    let m: RegExpMatchArray | null;

    if ((m = L.match(/^#\s*(.+)$/))) {
      flush();
      const parts = (m[1] ?? '')
        .split(/\s[·|–-]\s|·/)
        .map((x) => x.trim())
        .filter(Boolean);
      const ksPart = parts.find((p) => /^ks\s?[1-4]$/i.test(p));
      const rest = parts.filter((p) => p !== ksPart);
      const ks = ksPart ? normaliseKs(ksPart) : '';
      const found = findSubject(rest[0] ?? '', subjects, ks);
      head = {
        subject: found ? found.slug : null,
        newSubject: found ? null : (rest[0] ?? null),
        ks,
        topic: rest.slice(1).join(' '),
      };
      if (!found && !head.newSubject) head.subject = guessSubject(m[1] ?? '', subjects);
      return;
    }
    if ((m = L.match(/^(?:q(?:uestion)?\s*\d*\s*[:.)]|\d+\s*[.)])\s*(.+)$/i))) {
      start(m[1] ?? '', line);
      return;
    }
    const row: ImportRow = cur ?? start(L, line);
    if (row.line === line) return;
    const q = row.q;

    if ((m = L.match(/^(?:why|explanation|because)\s*:\s*(.+)$/i))) {
      q.explanation = (m[1] ?? '').trim();
      return;
    }
    if ((m = L.match(/^source\s*:\s*(\S+)/i))) {
      q.source_url = m[1] ?? '';
      return;
    }
    if (
      (m = L.match(
        /^slider\s*:\s*(-?[\d.]+)\s*(?:-|–|to)\s*(-?[\d.]+)\s*=\s*(-?[\d.]+)(?:\s*(?:±|\+\/-|\+-)\s*([\d.]+))?\s*(.*)$/i,
      ))
    ) {
      const [min, max, correct, band] = [+(m[1] ?? ''), +(m[2] ?? ''), +(m[3] ?? ''), +(m[4] ?? 0)];
      const places = Math.max(
        decimals(m[1] ?? ''),
        decimals(m[2] ?? ''),
        decimals(m[3] ?? ''),
        decimals(m[4] ?? ''),
      );
      row.q = {
        ...q,
        type: 'slider',
        slider: {
          min,
          max,
          step: places ? Number((10 ** -places).toFixed(places)) : 1,
          unit: (m[5] ?? '').trim(),
          correct,
          accept_min: Number((correct - band).toFixed(places)),
          accept_max: Number((correct + band).toFixed(places)),
        },
      };
      delete row.q.options;
      delete row.q.answer;
      row.marks = 1;
      return;
    }
    if (/^true\s*\*?\s*\/\s*false\s*\*?$/i.test(L)) {
      const answer = /true\s*\*/i.test(L) ? true : /false\s*\*/i.test(L) ? false : undefined;
      row.q = { ...q, type: 'boolean' };
      delete row.q.options;
      if (answer === undefined) delete row.q.answer;
      else row.q.answer = answer;
      row.marks = answer === undefined ? 0 : 1;
      return;
    }
    if ((m = L.match(/^answer\s*:\s*(.+)$/i))) {
      const a = (m[1] ?? '').trim().toLowerCase();
      if (/^(true|false)$/.test(a)) {
        row.q = { ...q, type: 'boolean', answer: a === 'true' };
        delete row.q.options;
        row.marks = 1;
      } else {
        const options = q.options ?? [];
        const right = /^[a-f]\)?$/.test(a)
          ? 'abcdef'.indexOf(a.charAt(0))
          : options.findIndex((o) => o.label.toLowerCase() === a);
        options.forEach((o, k) => (o.correct = k === right));
        row.marks = right >= 0 && right < options.length ? 1 : 0;
      }
      return;
    }
    const opts = [...L.matchAll(/(?:^|\s)([A-Fa-f])[).:]\s*(.+?)(?=\s+[A-Fa-f][).:]\s|$)/g)];
    if (opts.length && q.options) {
      for (const o of opts) {
        let label = (o[2] ?? '').trim();
        const star = /\*$/.test(label);
        label = label.replace(/\*$/, '').trim();
        if (star) row.marks += 1;
        q.options.push({ label, correct: star });
      }
      return;
    }
    q.prompt += ` ${L}`;
  });
  flush();
  return markFileDups(out);
}

/** Ready rows (no blocking errors) grouped by subject, key stage and topic. */
export function groupsOf(rows: ImportRow[]): ImportGroup[] {
  const groups = new Map<string, ImportGroup>();
  for (const r of rows) {
    if (r.block.length) continue;
    const sid = r.newSubject ? `new:${r.newSubject}` : r.subject;
    const key = `${sid}|${r.ks}|${r.topic}`;
    const g = groups.get(key) ?? { key, sid, ks: r.ks, topic: r.topic, rows: [] };
    g.rows.push(r);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** The question in the server's content shape, ready for create or append. */
export function rowToContent(row: ImportRow): QuestionContent {
  const c = toContent(row.q);
  delete c.id;
  return c;
}

export const IMPORT_SAMPLE = `Q: How many sides does a hexagon have?
A) 5  B) 6*  C) 7  D) 8
Why: "Hex" means six.
Source: https://www.britannica.com/science/hexagon

Q: What gas do plants take in to make food?
A) Oxygen  B) Nitrogen  C) Carbon dioxide*  D) Helium
Why: Plants use carbon dioxide, water and sunlight to make sugar.
Source: https://www.britannica.com/science/photosynthesis

Q: Which ocean is the largest?
A) Atlantic  B) Indian
Why: The Pacific is the largest.

# Maths · KS2 · Times tables 2
Q: What is 6 × 9?
A) 54*  B) 56  C) 45  D) 63
Why: Six nines are fifty-four.
Source: https://www.bbc.co.uk/bitesize/subjects/z826n39

Q: 9 × 9 = 81
True*/False
Why: Nine nines are eighty-one.
Source: https://www.bbc.co.uk/bitesize/subjects/z826n39

Q: What is 7 × 12?
A) 72  B) 84*  C) 82  D) 96
Why: 7 × 12 = 70 + 14 = 84.
Source: https://www.bbc.co.uk/bitesize/subjects/z826n39

Q: How many days are in a leap year?
Slider: 300-400 = 366 ±0 days
Why: A leap year has an extra day, 29 February.
Source: https://www.britannica.com/science/leap-year-calendar

# Drama · KS2 · Theatre words
1. What do we call the people who watch a play?
a) Cast
b) Audience
c) Script
d) Props
Answer: b
Why: The audience watches the performance.
Source: https://www.britannica.com/art/theatre-art

Q: What is 6 × 7?
A) 42*  B) 48  C) 36  D) 49
Why: Six sevens are forty-two.`;

export const IMPORT_CHEATSHEET = `# Maths · KS2 · Fractions
Q: What is half of 18?
A) 6  B) 9*  C) 12  D) 8
Why: 18 split into 2 equal groups is 9.
Source: https://www.bbc.co.uk/bitesize/…

Q: The Sun is a star.
True*/False

Q: Days in a leap year?
Slider: 300-400 = 366 ±0 days`;
