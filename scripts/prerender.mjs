// Prerender published category (/c/<slug>) and quiz (/q/<slug>) pages after `vite build`.
// Reads only the public catalogue API and writes dist/c/<slug>/index.html and
// dist/q/<slug>/index.html, so search engines and link unfurlers get real titles, meta and
// intro text without running JS. The host stays static: nothing here runs on cPanel.
//
// Settings (environment):
//   PRERENDER=0           skip entirely
//   PRERENDER_API_URL     catalogue API base, e.g. http://127.0.0.1:55520/api/v1
//   VITE_CPANEL_API_URL   used when absolute (http/https) and PRERENDER_API_URL is unset
//   PRERENDER_SITE_URL    public origin for canonical links (else VITE_APP_URL, else live)
// If the API cannot be reached the build still succeeds: a warning is printed, no pages are
// written and the app shell serves every route as before.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryPage, isSlug, quizPage } from './prerender-html.mjs';

const DEFAULT_ORIGIN = 'https://doyouknow.space';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const env = process.env;

function absolute(value) {
  return typeof value === 'string' && /^https?:\/\/[^\s]+$/.test(value)
    ? value.replace(/\/+$/, '')
    : null;
}

const apiBase =
  absolute(env.PRERENDER_API_URL) ?? absolute(env.VITE_CPANEL_API_URL);
const origin = absolute(env.PRERENDER_SITE_URL) ?? absolute(env.VITE_APP_URL) ?? DEFAULT_ORIGIN;

async function getJson(pathname) {
  const response = await fetch(apiBase + pathname, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`${pathname} answered ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body)) throw new Error(`${pathname} did not return a list`);
  return body;
}

async function writePage(kind, slug, html) {
  // Slugs come from the API; only [a-z0-9-] may ever become a folder name.
  if (!isSlug(slug)) return false;
  const folder = path.join(dist, kind, slug);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, 'index.html'), html);
  return true;
}

async function main() {
  if (env.PRERENDER === '0' || !apiBase) {
    process.stdout.write('prerender: skipped (PRERENDER=0)\n');
    return;
  }
  const shell = await readFile(path.join(dist, 'index.html'), 'utf8');
  let categories;
  let quizzes;
  try {
    categories = (await getJson('/categories')).filter((row) => isSlug(row?.slug));
    // The list endpoint returns up to 100 rows, so also ask per category.
    const lists = await Promise.all([
      getJson('/quizzes'),
      ...categories.map((category) =>
        getJson(`/quizzes?category_id=${encodeURIComponent(category.id)}`),
      ),
    ]);
    const bySlug = new Map();
    for (const row of lists.flat()) {
      if (isSlug(row?.slug) && row.status === 'published') bySlug.set(row.slug, row);
    }
    quizzes = [...bySlug.values()];
  } catch (error) {
    console.warn(`prerender: skipped, catalogue API unreachable at ${apiBase} (${error.message})`);
    return;
  }
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  let written = 0;
  for (const category of categories) {
    const own = quizzes.filter((quiz) => quiz.category_id === category.id);
    if (await writePage('c', category.slug, categoryPage(shell, origin, category, own))) written++;
  }
  for (const quiz of quizzes) {
    const category = categoryById.get(quiz.category_id) ?? null;
    if (await writePage('q', quiz.slug, quizPage(shell, origin, quiz, category))) written++;
  }
  process.stdout.write(
    `prerender: ${written} pages (${categories.length} categories, ${quizzes.length} quizzes) from ${apiBase}\n`,
  );
}

await main();
