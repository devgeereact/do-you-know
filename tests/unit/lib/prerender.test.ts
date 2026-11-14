import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  categoryPage,
  escapeHtml,
  infoPages,
  jsonForScript,
  quizPage,
  staticPage,
  summary,
} from '../../../scripts/prerender-html.mjs';
import { enGB } from '@/i18n/en-GB';

// The real source shell has every tag the generator replaces, like dist/index.html.
const shell = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
const ORIGIN = 'https://doyouknow.space';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function meta(doc: Document, selector: string): string | null {
  return doc.head.querySelector(selector)?.getAttribute('content') ?? null;
}

type Node = Record<string, unknown>;

/** Every JSON-LD node in the head: the shell's site block and the page's own block. */
function graph(doc: Document): Node[] {
  return [...doc.head.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const data = JSON.parse(script.textContent ?? 'null') as Node;
    return (data['@graph'] as Node[] | undefined) ?? [data];
  });
}

/** The page's main node: the first one after the shell's Organization and WebSite. */
function jsonLd(doc: Document): Node {
  return graph(doc).find((n) => !['Organization', 'WebSite'].includes(String(n['@type'])))!;
}

function crumbs(doc: Document): string[] {
  const list = graph(doc).find((n) => n['@type'] === 'BreadcrumbList');
  return ((list?.itemListElement as Node[]) ?? []).map((item) => String(item.name));
}

const hostile = `Tom & Jerry's "<b>best</b>" </script><script>alert(1)</script>`;

describe('escapeHtml', () => {
  it('escapes every character that can break out of text or an attribute', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('jsonForScript', () => {
  it('cannot close the script tag and still parses to the same value', () => {
    const value = { name: hostile, line: 'a\u2028b' };
    const text = jsonForScript(value);
    expect(text).not.toMatch(/<|>|&|\u2028/);
    expect(JSON.parse(text)).toEqual(value);
  });
});

describe('summary', () => {
  it('collapses whitespace and cuts long text at a word boundary', () => {
    expect(summary('  one\n two  ')).toBe('one two');
    const cut = summary('word '.repeat(100), 50);
    expect(cut.length).toBeLessThanOrEqual(50);
    expect(cut.endsWith('word…')).toBe(true);
  });
});

describe('quizPage', () => {
  const quiz = {
    slug: 'space-facts',
    title: hostile,
    intro: 'Rockets & <planets>.',
    seo_title: null,
    seo_description: null,
    question_count: 10,
    difficulty: 'hard',
    age_min: 7,
    age_max: 11,
  };
  const html = quizPage(shell, ORIGIN, quiz, { slug: 'science', name: 'Science & Nature' });
  const doc = parse(html);

  it('sets title, description, canonical and og tags for the quiz', () => {
    expect(doc.title).toBe(`${hostile} quiz · Do You Know`);
    expect(meta(doc, 'meta[name="description"]')).toBe(
      'Rockets & <planets>. 10 questions for ages 7 to 11.',
    );
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${ORIGIN}/q/space-facts`,
    );
    expect(meta(doc, 'meta[property="og:title"]')).toBe(`${hostile} quiz · Do You Know`);
    expect(meta(doc, 'meta[property="og:description"]')).toBe(
      'Rockets & <planets>. 10 questions for ages 7 to 11.',
    );
    expect(meta(doc, 'meta[property="og:url"]')).toBe(`${ORIGIN}/q/space-facts`);
    expect(meta(doc, 'meta[name="robots"]')).toBe('index, follow');
  });

  it('keeps exactly one of each replaced tag', () => {
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(doc.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(doc.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(doc.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(1);
  });

  it('escapes hostile text so no script is injected', () => {
    // Only the theme script, the site and page ld+json blocks and the app module script exist.
    expect(doc.querySelectorAll('script')).toHaveLength(4);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<b>best</b>');
  });

  it('adds Quiz JSON-LD with metadata only', () => {
    const data = jsonLd(doc);
    expect(data['@type']).toBe('Quiz');
    expect(data.name).toBe(hostile);
    expect(data.url).toBe(`${ORIGIN}/q/space-facts`);
    expect(data.typicalAgeRange).toBe('7-11');
    expect(JSON.stringify(graph(doc))).not.toMatch(/is_correct|options|answer|snapshot/);
  });

  it('adds a Home > subject > quiz breadcrumb', () => {
    expect(crumbs(doc)).toEqual(['Home', 'Science & Nature quizzes', `${hostile} quiz`]);
  });

  it('puts a readable h1 and intro outside #root and leaves #root empty', () => {
    const block = doc.getElementById('prerender');
    expect(block?.querySelector('h1')?.textContent).toBe(hostile);
    expect(block?.textContent).toContain('Rockets & <planets>.');
    expect(block?.textContent).toContain('10 questions · Tricky · Ages 7 to 11');
    expect(block?.querySelector('a')?.getAttribute('href')).toBe('/c/science');
    expect(block?.closest('#root')).toBeNull();
    expect(doc.getElementById('root')?.innerHTML).toBe('');
    expect(block?.className).toBe('sr-only');
    expect(html).toMatch(/<noscript><style>#prerender\{position:static/);
  });

  it('prefers the SEO title and description when the quiz has them', () => {
    const seo = parse(
      quizPage(
        shell,
        ORIGIN,
        { ...quiz, seo_title: 'Space quiz', seo_description: 'Ten space questions.' },
        null,
      ),
    );
    expect(seo.title).toBe('Space quiz · Do You Know');
    expect(meta(seo, 'meta[name="description"]')).toBe('Ten space questions.');
    expect(seo.getElementById('prerender')?.querySelector('a')?.getAttribute('href')).toBe('/');
  });

  it('fails loudly when the shell is missing a tag it must replace', () => {
    expect(() => quizPage('<html><head></head><body></body></html>', ORIGIN, quiz, null)).toThrow(
      /app shell has no/,
    );
  });
});

describe('categoryPage', () => {
  const html = categoryPage(
    shell,
    ORIGIN,
    { slug: 'science', name: 'Science & Nature', description: null },
    [
      { slug: 'space-facts', title: 'Space <facts>' },
      { slug: '../escape', title: 'Bad slug' },
    ],
  );
  const doc = parse(html);

  it('uses the same title as the app and the default description when none is set', () => {
    expect(doc.title).toBe('Science & Nature quizzes · Do You Know');
    expect(meta(doc, 'meta[name="description"]')).toMatch(/^Free quizzes for children/);
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${ORIGIN}/c/science`,
    );
  });

  it('lists only quizzes with safe slugs, as links and in CollectionPage JSON-LD', () => {
    const links = [...doc.querySelectorAll('#prerender li a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/q/space-facts']);
    expect(links[0]?.textContent).toBe('Space <facts>');
    const data = jsonLd(doc);
    expect(data['@type']).toBe('CollectionPage');
    expect(data.hasPart).toEqual([
      { '@type': 'Quiz', name: 'Space <facts>', url: `${ORIGIN}/q/space-facts` },
    ]);
  });
});

describe('prerender.mjs in a release build', () => {
  const run = (env: Record<string, string>) =>
    spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/prerender.mjs')], {
      env: { PATH: process.env.PATH ?? '', ...env },
      encoding: 'utf8',
      timeout: 20_000,
    });

  it('fails instead of shipping the bare shell when pages are required and no API is set', () => {
    const result = run({ PRERENDER_REQUIRED: '1' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/prerender/);
  });

  it('still skips quietly in an ordinary local build', () => {
    expect(run({}).status).toBe(0);
  });
});

describe('categoryPage with the full catalogue', () => {
  const doc = parse(
    categoryPage(
      shell,
      ORIGIN,
      { slug: 'science', name: 'Science', description: 'Space, bodies and bugs.' },
      [
        {
          slug: 'space-facts',
          title: 'Space facts',
          intro: 'Rockets and planets.',
          question_count: 10,
          age_min: 7,
          age_max: 11,
        },
      ],
      [
        { slug: 'science', name: 'Science' },
        { slug: 'history', name: 'History & <Time>' },
      ],
    ),
  );

  it('describes each quiz, not just its title', () => {
    expect(doc.querySelector('#prerender li')?.textContent).toBe(
      'Space facts: Rockets and planets. 10 questions for ages 7 to 11.',
    );
  });

  it('links the other subjects, escaped, and not itself', () => {
    const others = [...doc.querySelectorAll('#prerender nav a')];
    expect(others.map((a) => a.getAttribute('href'))).toEqual(['/c/history']);
    expect(others[0]?.textContent).toBe('History & <Time> quizzes');
  });

  it('adds a Home > subject breadcrumb', () => {
    expect(crumbs(doc)).toEqual(['Home', 'Science quizzes']);
  });
});

describe('the site block in the shell', () => {
  const doc = parse(shell);

  it('names the organisation and the site once, for every page', () => {
    const nodes = graph(doc);
    expect(nodes.map((n) => n['@type'])).toEqual(['Organization', 'WebSite']);
    expect(nodes[0]?.url).toBe(`${ORIGIN}/`);
    expect(nodes[0]?.logo).toBe(`${ORIGIN}/icons/pwa-512.png`);
  });

  it('gives the home page a title that says what the site is', () => {
    expect(doc.title.length).toBeGreaterThan(30);
    expect(doc.title).toMatch(/^Do You Know/);
    expect(doc.title).toMatch(/quiz/i);
  });
});

describe('staticPage and infoPages', () => {
  const pages = infoPages(enGB);

  it('covers every info page in the sitemap', () => {
    expect(pages.map((p) => p.path)).toEqual([
      'about',
      'how-to-play',
      'daily',
      'leaderboards',
      'contact',
      'privacy',
      'terms',
    ]);
  });

  it('writes the same title and description the app sets, with a readable block', () => {
    const about = pages.find((p) => p.path === 'about')!;
    const doc = parse(staticPage(shell, ORIGIN, about));
    expect(doc.title).toBe('About · Do You Know');
    expect(meta(doc, 'meta[name="description"]')).toBe(enGB.info.about.metaDescription);
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${ORIGIN}/about`,
    );
    const block = doc.getElementById('prerender');
    expect(block?.querySelector('h1')?.textContent).toBe('About Do You Know');
    expect(block?.textContent).toContain(enGB.info.about.fair);
    expect(jsonLd(doc)['@type']).toBe('WebPage');
    expect(crumbs(doc)).toEqual(['Home', 'About']);
  });

  it('escapes page text', () => {
    const doc = parse(
      staticPage(shell, ORIGIN, {
        path: 'x',
        title: 'A & B',
        description: '<d>',
        heading: '<h>',
        sections: [{ heading: '<s>', paragraphs: ['</script><script>alert(1)</script>'] }],
      }),
    );
    expect(doc.querySelectorAll('script')).toHaveLength(4);
    expect(doc.getElementById('prerender')?.querySelector('h1')?.textContent).toBe('<h>');
  });
});

describe('quizPage related links', () => {
  const doc = parse(
    quizPage(
      shell,
      ORIGIN,
      { slug: 'space-facts', title: 'Space facts' },
      { slug: 'science', name: 'Science' },
      [
        { slug: 'space-facts', title: 'Space facts' },
        { slug: 'bugs', title: 'Bugs & <beetles>' },
        { slug: '../bad', title: 'Bad' },
      ],
    ),
  );

  it('links other quizzes in the same subject, never itself or an unsafe slug', () => {
    const links = [...doc.querySelectorAll('#prerender nav a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/q/bugs']);
    expect(links[0]?.textContent).toBe('Bugs & <beetles>');
  });
});
