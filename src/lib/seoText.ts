// Search titles and descriptions for quiz pages. Shared by the app (useDocumentMeta) and the
// build-time prerender (scripts/prerender-html.mjs imports this file directly), so the two always
// agree. Keep it free of imports: Node loads it without the Vite path aliases.

interface QuizSeoFields {
  title?: string;
  seo_title?: string | null;
  intro?: string | null;
  seo_description?: string | null;
  question_count?: number | null;
  age_min?: number | null;
  age_max?: number | null;
}

const NAMES_ITSELF = /\b(quiz|quizzes|challenge|masters|test)\b/i;

/** The Studio's SEO title, else the title with "quiz" added when it does not say what it is. */
export function quizSeoTitle(quiz: QuizSeoFields & { title: string }): string {
  if (quiz.seo_title) return quiz.seo_title;
  return NAMES_ITSELF.test(quiz.title) ? quiz.title : `${quiz.title} quiz`;
}

function ages(min: number | null | undefined, max: number | null | undefined): string | null {
  const lo = Number.isInteger(min) ? min : null;
  const hi = Number.isInteger(max) ? max : null;
  if (lo !== null && hi !== null) return `for ages ${lo} to ${hi}`;
  if (lo !== null) return `for ages ${lo} and up`;
  if (hi !== null) return `for ages up to ${hi}`;
  return null;
}

/**
 * The Studio's SEO description, else the intro followed by plain facts ("20 questions for ages
 * 7 to 11."). Deliberately no shared closing line, so the 46 pages never read as a template.
 */
export function quizSeoDescription(quiz: QuizSeoFields): string | null {
  if (quiz.seo_description) return quiz.seo_description;
  const intro = (quiz.intro ?? '').trim();
  const count = Number.isInteger(quiz.question_count) ? `${quiz.question_count} questions` : null;
  const forAges = ages(quiz.age_min, quiz.age_max);
  const facts = [count, forAges].filter(Boolean).join(' ');
  const sentence = facts ? `${facts.charAt(0).toUpperCase()}${facts.slice(1)}.` : '';
  const text = [intro, sentence].filter(Boolean).join(' ');
  return text || null;
}
