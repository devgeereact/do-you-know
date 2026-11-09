/** The /c/<slug> and /q/<slug> addresses listed in a sitemap. */
export function pageUrls(sitemapXml: string): string[];
/** True when the page's own canonical link names it, which only a prerendered page has. */
export function ownsPage(html: string, url: string): boolean;
/** The pages with no prerendered head. A page that cannot be fetched counts as a gap. */
export function findGap(options: {
  sitemapXml: string;
  fetchHtml: (url: string) => Promise<string>;
  concurrency?: number;
}): Promise<string[]>;
