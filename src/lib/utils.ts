import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional Tailwind classes, resolving conflicts
 * (e.g. `cn('p-2', condition && 'p-4')` → `p-4`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** True for http(s) links only, so content can never inject a `javascript:` href. */
export function isWebUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

/** Any play screen: /play/:slug, /daily/play or /challenge/:code/play. */
export function isPlayPath(pathname: string): boolean {
  return pathname.startsWith('/play/') || /\/play\/?$/.test(pathname);
}
