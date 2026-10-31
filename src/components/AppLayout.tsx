import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TabBar } from '@/components/TabBar';
import { usePageEnter } from '@/hooks/usePageEnter';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/** Pages that fill exactly one screen: no page scroll, lists scroll inside their cards. */
const FIT_PAGES = new Set(['/daily', '/leaderboards']);

/**
 * Shell for every browse page: header, page, footer and (below desktop width) the tab bar.
 * The footer always sits at the bottom of the screen. Play screens sit outside this shell.
 */
export function AppLayout(): JSX.Element {
  const content = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  usePageEnter(content, pathname);
  const fit = FIT_PAGES.has(pathname);
  return (
    <div
      className={cn(
        'relative isolate flex flex-col',
        fit ? 'h-dvh overflow-hidden' : 'min-h-dvh pb-24 lg:pb-0',
      )}
    >
      <a
        href="#content"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.nav.skipToContent}
      </a>
      <SiteHeader />
      <div
        ref={content}
        id="content"
        tabIndex={-1}
        className={cn(
          'flex-1 focus:outline-none',
          fit && 'min-h-0 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0',
        )}
      >
        <Outlet />
      </div>
      <div className={cn(fit && 'hidden lg:block')}>
        <SiteFooter />
      </div>
      <TabBar />
    </div>
  );
}
