import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SkyBackdrop } from '@/components/motion/SkyBackdrop';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TabBar } from '@/components/TabBar';
import { usePageEnter } from '@/hooks/usePageEnter';
import { t } from '@/i18n';

/**
 * Shell for every browse page: header, page, footer and (on phones) the tab bar.
 * Play screens sit outside it so nothing distracts from the question.
 */
export function AppLayout(): JSX.Element {
  // Scrolling to the top on a new page lives in SmoothScroll, which owns the scroll.
  const content = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  usePageEnter(content, pathname);
  return (
    <div className="relative isolate flex min-h-dvh flex-col pb-24 md:pb-0">
      <SkyBackdrop />
      <a
        href="#content"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.nav.skipToContent}
      </a>
      <SiteHeader />
      <div ref={content} id="content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </div>
      <SiteFooter />
      <TabBar />
    </div>
  );
}
