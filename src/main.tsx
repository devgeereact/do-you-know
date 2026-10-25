import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSentry } from '@/lib/sentry';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { App } from '@/App';
import '@/index.css';
import '@/lib/motion';

// Wire up monitoring before anything renders.
initSentry();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Prerendered /c/ and /q/ pages carry a static h1 and intro outside #root for crawlers
// (scripts/prerender.mjs). The app now renders the real page, so drop the copy.
document.getElementById('prerender')?.remove();
