import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TabBar } from '@/components/TabBar';

/**
 * Shell for every browse page: header, page, footer and (on phones) the tab bar.
 * Play screens sit outside it so nothing distracts from the question.
 */
export function AppLayout(): JSX.Element {
  const { pathname, hash } = useLocation();

  // A new page starts at the top unless the link points at a section.
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="flex min-h-dvh flex-col pb-24 md:pb-0">
      <a
        href="#content"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div id="content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </div>
      <SiteFooter />
      <TabBar />
    </div>
  );
}
