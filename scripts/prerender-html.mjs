// Pure HTML builders for scripts/prerender.mjs: no file system, no network.
// Each page is a copy of the built app shell with its own head tags and a short static
// block (h1 + intro) that search engines and link unfurlers can read without running JS.
// Only published catalogue metadata goes in; never questions, options or answers.
import { quizSeoDescription, quizSeoTitle } from '../src/lib/seoText.ts';

export const SITE = 'Do You Know';
export const DEFAULT_DESCRIPTION =
  'Free quizzes for children and grown-ups: a daily challenge, friend battles and KS1 to GCSE practice. Every answer is explained and sourced. No ads.';
const DESCRIPTION_LIMIT = 200;
const SLUG = /^[a-z0-9-]{1,100}$/;

/** Escape text for HTML element content and double- or single-quoted attributes. */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** JSON for an inline ld+json script: nothing inside can close the tag or break the line. */
export function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** One line of plain text, cut at a word boundary for meta descriptions. */
export function summary(text, limit = DESCRIPTION_LIMIT) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const space = cut.lastIndexOf(' ');
  return (space > limit / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, '') + '…';
}

export function isSlug(value) {
  return typeof value === 'string' && SLUG.test(value);
}

function replaceTag(html, pattern, replacement, name) {
  if (!pattern.test(html)) throw new Error(`prerender: app shell has no ${name}`);
  return html.replace(pattern, () => replacement);
}

/**
 * Put per-page head tags and the static block into a copy of dist/index.html.
 * @param {string} shell built dist/index.html
 * @param {{ title: string, description: string, url: string, jsonLd: object, bodyHtml: string }} page
 */
export function renderPage(shell, page) {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = escapeHtml(page.url);
  let html = shell;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, 'title');
  html = replaceTag(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`,
    'meta description',
  );
  html = replaceTag(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`,
    'canonical link',
  );
  html = replaceTag(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
    'og:title',
  );
  html = replaceTag(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`,
    'og:description',
  );
  html = replaceTag(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${url}" />`,
    'og:url',
  );
  const head =
    `\n    <meta name="robots" content="index, follow" />\n` +
    `    <script type="application/ld+json">${jsonForScript(page.jsonLd)}</script>\n  </head>`;
  html = replaceTag(html, /<\/head>/, head, 'closing head tag');
  // The block sits outside #root, so React never hydrates or diffs it; main.tsx removes it
  // once the app mounts. It is visually hidden while JS runs and shown when JS is off.
  const block =
    `<div id="prerender" class="sr-only">${page.bodyHtml}</div>\n` +
    `    <noscript><style>#prerender{position:static;width:auto;height:auto;margin:0;padding:1.5rem;overflow:visible;clip:auto;white-space:normal}</style></noscript>\n` +
    `    <div id="root"></div>`;
  html = replaceTag(html, /<div id="root"><\/div>/, block, 'root element');
  return html;
}

function pageTitle(name) {
  return `${name} · ${SITE}`;
}

/** BreadcrumbList from [name, url] pairs, Home first. */
function breadcrumb(origin, trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [['Home', `${origin}/`], ...trail].map(([name, item], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item,
    })),
  };
}

/** One ld+json block holding the page's main node and its breadcrumb. */
function pageGraph(main, crumbs) {
  return { '@context': 'https://schema.org', '@graph': [main, crumbs] };
}

const ORG = (origin) => ({ '@id': `${origin}/#organization` });

/**
 * @param {{ slug: string, name: string, description?: string | null }} category
 * @param {Array<{ slug: string, title: string }>} quizzes published quizzes in this category
 */
export function categoryPage(shell, origin, category, quizzes, categories = []) {
  const url = `${origin}/c/${category.slug}`;
  const name = `${category.name} quizzes`;
  const description = summary(category.description) || DEFAULT_DESCRIPTION;
  const listed = quizzes.filter((quiz) => isSlug(quiz.slug));
  const items = listed
    .map((quiz) => {
      const about = quizSeoDescription({ ...quiz, seo_description: null });
      return (
        `<li><a href="/q/${quiz.slug}">${escapeHtml(quiz.title)}</a>` +
        (about ? `: ${escapeHtml(summary(about, 300))}` : '') +
        '</li>'
      );
    })
    .join('');
  const others = categories
    .filter((other) => isSlug(other.slug) && other.slug !== category.slug)
    .map((other) => `<li><a href="/c/${other.slug}">${escapeHtml(other.name)} quizzes</a></li>`)
    .join('');
  const bodyHtml =
    `<h1>${escapeHtml(name)}</h1>` +
    (category.description ? `<p>${escapeHtml(summary(category.description, 600))}</p>` : '') +
    (items ? `<ul>${items}</ul>` : '') +
    (others ? `<nav aria-label="Other subjects"><h2>Other subjects</h2><ul>${others}</ul></nav>` : '') +
    `<p><a href="/">More quizzes on ${SITE}</a></p>`;
  return renderPage(shell, {
    title: pageTitle(name),
    description,
    url,
    bodyHtml,
    jsonLd: pageGraph(
      {
        '@type': 'CollectionPage',
        name,
        description,
        url,
        inLanguage: 'en-GB',
        isPartOf: { '@id': `${origin}/#website` },
        publisher: ORG(origin),
        hasPart: listed.map((quiz) => ({
          '@type': 'Quiz',
          name: quiz.title,
          url: `${origin}/q/${quiz.slug}`,
        })),
      },
      breadcrumb(origin, [[name, url]]),
    ),
  });
}

const DIFFICULTY = { easy: 'Easy', medium: 'Medium', hard: 'Tricky' };

/**
 * @param {{ slug: string, title: string, intro?: string | null, seo_title?: string | null,
 *   seo_description?: string | null, question_count?: number, difficulty?: string,
 *   age_min?: number | null, age_max?: number | null }} quiz
 * @param {{ slug: string, name: string } | null} category
 */
export function quizPage(shell, origin, quiz, category, siblings = []) {
  const url = `${origin}/q/${quiz.slug}`;
  const heading = quiz.title;
  const seoTitle = quizSeoTitle(quiz);
  const description = summary(quizSeoDescription(quiz)) || DEFAULT_DESCRIPTION;
  const facts = [];
  if (Number.isInteger(quiz.question_count)) facts.push(`${quiz.question_count} questions`);
  if (quiz.difficulty && DIFFICULTY[quiz.difficulty]) facts.push(DIFFICULTY[quiz.difficulty]);
  const ages = ageRange(quiz.age_min, quiz.age_max);
  const agesLabel = ageLabel(quiz.age_min, quiz.age_max);
  if (agesLabel) facts.push(agesLabel);
  const bodyHtml =
    `<h1>${escapeHtml(heading)}</h1>` +
    (quiz.intro ? `<p>${escapeHtml(summary(quiz.intro, 600))}</p>` : '') +
    (facts.length ? `<p>${escapeHtml(facts.join(' · '))}</p>` : '') +
    related(quiz, category, siblings) +
    (category && isSlug(category.slug)
      ? `<p><a href="/c/${category.slug}">More ${escapeHtml(category.name)} quizzes</a></p>`
      : `<p><a href="/">More quizzes on ${SITE}</a></p>`);
  const main = {
    '@type': 'Quiz',
    name: heading,
    description,
    url,
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    learningResourceType: 'Quiz',
    isPartOf: { '@id': `${origin}/#website` },
    publisher: ORG(origin),
  };
  if (ages) main.typicalAgeRange = ages;
  const trail = [];
  if (category && isSlug(category.slug)) {
    main.about = { '@type': 'Thing', name: category.name };
    trail.push([`${category.name} quizzes`, `${origin}/c/${category.slug}`]);
  }
  trail.push([seoTitle, url]);
  return renderPage(shell, {
    title: pageTitle(seoTitle),
    description,
    url,
    bodyHtml,
    jsonLd: pageGraph(main, breadcrumb(origin, trail)),
  });
}

const RELATED = 4;

/** Up to four other quizzes in the same subject, as a small link list. */
function related(quiz, category, siblings) {
  const items = siblings
    .filter((other) => isSlug(other.slug) && other.slug !== quiz.slug)
    .slice(0, RELATED)
    .map((other) => `<li><a href="/q/${other.slug}">${escapeHtml(other.title)}</a></li>`)
    .join('');
  if (!items) return '';
  const label = category ? `More ${category.name} quizzes` : 'More quizzes';
  return `<nav aria-label="${escapeHtml(label)}"><h2>${escapeHtml(label)}</h2><ul>${items}</ul></nav>`;
}

function ageRange(min, max) {
  const lo = Number.isInteger(min) ? min : null;
  const hi = Number.isInteger(max) ? max : null;
  if (lo !== null && hi !== null) return `${lo}-${hi}`;
  if (lo !== null) return `${lo}-`;
  if (hi !== null) return `0-${hi}`;
  return null;
}

/** Same words as src/lib/quizLabels.ts ageLabel, with "to" in place of a dash. */
function ageLabel(min, max) {
  const lo = Number.isInteger(min) ? min : null;
  const hi = Number.isInteger(max) ? max : null;
  if (lo !== null && hi !== null) return `Ages ${lo} to ${hi}`;
  if (lo !== null) return `Ages ${lo}+`;
  if (hi !== null) return `Up to age ${hi}`;
  return null;
}

/**
 * An info page (/about, /how-to-play, ...): the app's own title and description, an h1 and the
 * page's main copy, so search engines read the words people see without running JS.
 * @param {{ path: string, title: string, description: string, heading: string,
 *   sections: Array<{ heading?: string, paragraphs: string[] }> }} page
 */
export function staticPage(shell, origin, page) {
  const url = `${origin}/${page.path}`;
  const body = page.sections
    .map(
      (section) =>
        (section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : '') +
        section.paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join(''),
    )
    .join('');
  return renderPage(shell, {
    title: pageTitle(page.title),
    description: page.description,
    url,
    bodyHtml: `<h1>${escapeHtml(page.heading)}</h1>${body}<p><a href="/">Play a quiz on ${SITE}</a></p>`,
    jsonLd: pageGraph(
      {
        '@type': 'WebPage',
        name: page.title,
        description: page.description,
        url,
        inLanguage: 'en-GB',
        isPartOf: { '@id': `${origin}/#website` },
        publisher: ORG(origin),
      },
      breadcrumb(origin, [[page.title, url]]),
    ),
  });
}

/** The info pages listed in the sitemap, built from the app's own copy (src/i18n/en-GB.ts). */
export function infoPages(copy) {
  const { about, howToPlay, contact, privacy, terms } = copy.info;
  const text = (value) => (typeof value === 'string' ? [value] : []);
  return [
    {
      path: 'about',
      title: about.metaTitle,
      description: about.metaDescription,
      heading: about.title,
      sections: [
        { paragraphs: [about.lead] },
        { heading: about.whatTitle, paragraphs: about.what },
        { heading: about.everyoneTitle, paragraphs: about.everyone },
        { heading: about.fairTitle, paragraphs: [about.fair] },
      ],
    },
    {
      path: 'how-to-play',
      title: howToPlay.metaTitle,
      description: howToPlay.metaDescription,
      heading: howToPlay.title,
      sections: [
        { paragraphs: [howToPlay.lead] },
        {
          heading: howToPlay.kindsTitle,
          paragraphs: howToPlay.kinds.map((kind) => `${kind.name} ${kind.text}`),
        },
        { paragraphs: text(howToPlay.timer) },
        {
          heading: howToPlay.modesTitle,
          paragraphs: [
            `${howToPlay.rankedName} ${howToPlay.ranked}`,
            `${howToPlay.practiceName} ${howToPlay.practice}`,
          ],
        },
      ],
    },
    {
      path: 'daily',
      title: copy.common.todaysChallenge,
      description: copy.daily.metaDescription,
      heading: copy.common.todaysChallenge,
      sections: [{ paragraphs: [copy.daily.lead] }],
    },
    {
      path: 'leaderboards',
      title: copy.leaderboards.title,
      description: copy.leaderboards.metaDescription,
      heading: copy.leaderboards.title,
      sections: [{ paragraphs: [copy.leaderboards.metaDescription] }],
    },
    {
      path: 'contact',
      title: contact.metaTitle,
      description: contact.metaDescription,
      heading: contact.title,
      sections: [
        { paragraphs: [contact.lead] },
        { heading: contact.correctionsTitle, paragraphs: [contact.corrections] },
      ],
    },
    {
      path: 'privacy',
      title: privacy.metaTitle,
      description: privacy.metaDescription,
      heading: privacy.title,
      sections: [{ paragraphs: [privacy.metaDescription] }],
    },
    {
      path: 'terms',
      title: terms.metaTitle,
      description: terms.metaDescription,
      heading: terms.title,
      sections: [{ paragraphs: [terms.metaDescription] }],
    },
  ];
}
