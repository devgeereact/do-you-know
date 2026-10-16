import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export function NotFoundPage(): JSX.Element {
  useDocumentMeta({ title: 'Page not found', noindex: true });
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4 py-12 text-center md:px-8">
      <div className="animate-fade-up">
        <p
          aria-hidden="true"
          className="mx-auto mb-6 grid h-28 w-28 place-items-center rounded-full bg-secondary font-display text-7xl font-semibold text-secondary-fg"
        >
          ?
        </p>
        <h1 className="text-3xl font-semibold text-content">We can’t find that page</h1>
        <p className="mx-auto mb-8 mt-3 max-w-xs text-content-muted">
          The link might be old, or there might be a typo in it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className={buttonClasses('primary')}>
            Find a quiz
          </Link>
          <Link to="/daily" className={buttonClasses('ghost')}>
            Today’s challenge
          </Link>
        </div>
      </div>
    </main>
  );
}
