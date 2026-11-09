// Finds quiz and subject pages that are live in the sitemap but that the server still answers with the bare
// app shell, because the release that prerenders them has not run since they were published.
// .github/workflows/page-check.yml runs it daily and only reports: deploys stay on push to main (owner decision,
// 30 Oct 2026), so a gap is a nudge to run Deploy once (docs/CONTENT-PIPELINE-DESIGN.md, slice 4).
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://doyouknow.space';
const PAGE = /^https:\/\/[a-z0-9.-]+\/(?:c|q)\/[a-z0-9-]{1,100}$/;

/** The /c/<slug> and /q/<slug> addresses listed in a sitemap. */
export function pageUrls(sitemapXml) {
  const urls = [];
  for (const m of String(sitemapXml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    if (PAGE.test(m[1]) && m[1].startsWith(`${ORIGIN}/`)) urls.push(m[1]);
  }
  return urls;
}

/** True when the page's own canonical link names it, which only a prerendered page has (the shell names the home page). */
export function ownsPage(html, url) {
  const tag = String(html).match(/<link\b[^>]*\brel="canonical"[^>]*>/i)?.[0] ?? '';
  const href = tag.match(/\bhref="([^"]*)"/i)?.[1];
  return href === url;
}

/** The pages with no prerendered head. A page that cannot be fetched counts as a gap. */
export async function findGap({ sitemapXml, fetchHtml, concurrency = 8 }) {
  const urls = pageUrls(sitemapXml);
  const gap = [];
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        if (!ownsPage(await fetchHtml(url), url)) gap.push(url);
      } catch {
        gap.push(url);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return urls.filter((u) => gap.includes(u));
}

async function main() {
  const site = (process.argv.slice(2).find((a) => !a.startsWith('--')) ?? ORIGIN).replace(
    /\/+$/,
    '',
  );
  const get = async (url) => {
    const r = await fetch(url, {
      headers: { Accept: 'text/html,application/xml' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`${url} answered ${r.status}`);
    return r.text();
  };
  let sitemapXml;
  try {
    sitemapXml = await get(`${site}/sitemap.xml`);
  } catch (error) {
    // Without the sitemap there is nothing to compare: do not release on a guess.
    console.log(`gap: cannot read the sitemap (${error.message}); no release needed`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'release=false\n');
    return;
  }
  const gap = await findGap({ sitemapXml, fetchHtml: get });
  console.log(
    `gap: ${gap.length} of ${pageUrls(sitemapXml).length} pages have no prerendered head`,
  );
  for (const url of gap.slice(0, 20)) console.log(`  ${url}`);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `release=${gap.length > 0}\n`);
  if (gap.length > 0 && process.argv.includes('--fail-on-gap')) {
    console.error('Run Deploy once (Actions > Deploy > Run workflow) so these pages are built.');
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
