// Types for prerender-html.mjs, so the unit tests stay under TypeScript strict.
export interface PrerenderCategory {
  slug: string;
  name: string;
  description?: string | null;
}
export interface PrerenderQuiz {
  slug: string;
  title: string;
  intro?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  question_count?: number;
  difficulty?: string;
  age_min?: number | null;
  age_max?: number | null;
}
export interface PrerenderPage {
  title: string;
  description: string;
  url: string;
  jsonLd: object;
  bodyHtml: string;
}
export const SITE: string;
export const DEFAULT_DESCRIPTION: string;
export function escapeHtml(value: unknown): string;
export function jsonForScript(value: unknown): string;
export function summary(text: string | null | undefined, limit?: number): string;
export function isSlug(value: unknown): value is string;
export function renderPage(shell: string, page: PrerenderPage): string;
export function categoryPage(
  shell: string,
  origin: string,
  category: PrerenderCategory,
  quizzes: ReadonlyArray<Pick<PrerenderQuiz, 'slug' | 'title'> & Partial<PrerenderQuiz>>,
  categories?: ReadonlyArray<Pick<PrerenderCategory, 'slug' | 'name'>>,
): string;
export function quizPage(
  shell: string,
  origin: string,
  quiz: PrerenderQuiz,
  category: Pick<PrerenderCategory, 'slug' | 'name'> | null,
  siblings?: ReadonlyArray<Pick<PrerenderQuiz, 'slug' | 'title'>>,
): string;
export interface PrerenderStaticPage {
  path: string;
  title: string;
  description: string;
  heading: string;
  sections: ReadonlyArray<{ heading?: string; paragraphs: ReadonlyArray<string> }>;
}
export function staticPage(shell: string, origin: string, page: PrerenderStaticPage): string;
export function infoPages(copy: typeof import('../src/i18n/en-GB').enGB): PrerenderStaticPage[];
