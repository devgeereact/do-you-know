import { describe, expect, it } from 'vitest';
import { findGap, ownsPage, pageUrls } from '../../../scripts/prerender-gap.mjs';

const SITEMAP = `<?xml version="1.0"?><urlset>
  <url><loc>https://doyouknow.space/</loc></url>
  <url><loc>https://doyouknow.space/about</loc></url>
  <url><loc>https://doyouknow.space/c/maths</loc><lastmod>2026-11-01</lastmod></url>
  <url><loc>https://doyouknow.space/q/fractions</loc></url>
  <url><loc>https://doyouknow.space/q/rivers</loc></url>
</urlset>`;

const page = (canonical: string): string =>
  `<html><head><link rel="canonical" href="${canonical}" /></head></html>`;
const SHELL = page('https://doyouknow.space/');

describe('which pages the sitemap lists', () => {
  it('takes only the quiz and subject pages', () => {
    expect(pageUrls(SITEMAP)).toEqual([
      'https://doyouknow.space/c/maths',
      'https://doyouknow.space/q/fractions',
      'https://doyouknow.space/q/rivers',
    ]);
  });

  it('ignores anything that is not a plain slug path', () => {
    expect(
      pageUrls('<loc>https://doyouknow.space/q/../x</loc><loc>https://evil.example/q/a</loc>'),
    ).toEqual([]);
  });
});

describe('does a page have its own prerendered head', () => {
  it('is true when the canonical names the page itself', () => {
    expect(
      ownsPage(page('https://doyouknow.space/q/rivers'), 'https://doyouknow.space/q/rivers'),
    ).toBe(true);
  });
  it('is false for the bare app shell', () => {
    expect(ownsPage(SHELL, 'https://doyouknow.space/q/rivers')).toBe(false);
  });
  it('reads the canonical whatever order its attributes are in', () => {
    expect(
      ownsPage(
        '<link href="https://doyouknow.space/q/a" rel="canonical">',
        'https://doyouknow.space/q/a',
      ),
    ).toBe(true);
  });
});

describe('the gap', () => {
  it('lists the pages still answered with the shell', async () => {
    const served: Record<string, string> = {
      'https://doyouknow.space/c/maths': page('https://doyouknow.space/c/maths'),
      'https://doyouknow.space/q/fractions': page('https://doyouknow.space/q/fractions'),
      'https://doyouknow.space/q/rivers': SHELL,
    };
    const gap = await findGap({
      sitemapXml: SITEMAP,
      fetchHtml: async (u: string) => served[u] ?? '',
    });
    expect(gap).toEqual(['https://doyouknow.space/q/rivers']);
  });

  it('is empty when every page is its own', async () => {
    const gap = await findGap({ sitemapXml: SITEMAP, fetchHtml: async (u: string) => page(u) });
    expect(gap).toEqual([]);
  });

  it('counts a page that cannot be fetched as a gap, so a broken site still triggers a release', async () => {
    const gap = await findGap({
      sitemapXml: SITEMAP,
      fetchHtml: async (u: string) => {
        if (u.endsWith('rivers')) throw new Error('timeout');
        return page(u);
      },
    });
    expect(gap).toEqual(['https://doyouknow.space/q/rivers']);
  });
});
