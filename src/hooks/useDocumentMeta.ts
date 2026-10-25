import { useEffect } from 'react';
import { t } from '@/i18n';

const ORIGIN = 'https://doyouknow.space';

interface DocumentMeta {
  /** Page name; " · Do You Know" is appended. Omit for the site name alone. */
  title?: string;
  description?: string;
  /** Private or per-player pages: keep them out of search results. */
  noindex?: boolean;
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/** Title, description, canonical and robots for the current route; every page calls it. */
export function useDocumentMeta({ title, description, noindex = false }: DocumentMeta): void {
  useEffect(() => {
    const fullTitle = title ? t.meta.title(title) : t.common.siteName;
    const text = description ?? t.meta.defaultDescription;
    document.title = fullTitle;
    setMeta('name', 'description', text);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', text);
    setMeta('property', 'og:url', ORIGIN + window.location.pathname);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = ORIGIN + window.location.pathname;
  }, [title, description, noindex]);
}
