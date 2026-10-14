import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/buttonClasses';

export function NotFoundPage(): JSX.Element {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
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
        <Link to="/" className={buttonClasses('primary')}>
          Back to the start
        </Link>
      </div>
    </main>
  );
}
