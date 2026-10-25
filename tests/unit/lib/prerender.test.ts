import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  categoryPage,
  escapeHtml,
  jsonForScript,
  quizPage,
  summary,
} from '../../../scripts/prerender-html.mjs';

// The real source shell has every tag the generator replaces, like dist/index.html.
const shell = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
const ORIGIN = 'https://doyouknow.space';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function meta(doc: Document, selector: string): string | null {
  return doc.head.querySelector(selector)?.getAttribute('content') ?? null;
}

function jsonLd(doc: Document): Record<string, unknown> {
  const script = doc.head.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent ?? 'null') as Record<string, unknown>;
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
    expect(doc.title).toBe(`${hostile} · Do You Know`);
    expect(meta(doc, 'meta[name="description"]')).toBe('Rockets & <planets>.');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${ORIGIN}/q/space-facts`,
    );
    expect(meta(doc, 'meta[property="og:title"]')).toBe(`${hostile} · Do You Know`);
    expect(meta(doc, 'meta[property="og:description"]')).toBe('Rockets & <planets>.');
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
    // Only the theme script, the ld+json block and the app module script exist.
    expect(doc.querySelectorAll('script')).toHaveLength(3);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<b>best</b>');
  });

  it('adds Quiz JSON-LD with metadata only', () => {
    const data = jsonLd(doc);
    expect(data['@type']).toBe('Quiz');
    expect(data.name).toBe(hostile);
    expect(data.url).toBe(`${ORIGIN}/q/space-facts`);
    expect(data.typicalAgeRange).toBe('7-11');
    expect(JSON.stringify(data)).not.toMatch(/is_correct|options|answer|snapshot/);
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
    expect(meta(doc, 'meta[name="description"]')).toMatch(/^Fun, fair quizzes/);
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
