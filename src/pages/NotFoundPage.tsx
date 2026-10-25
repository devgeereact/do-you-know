import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { t } from '@/i18n';

export function NotFoundPage(): JSX.Element {
  useDocumentMeta({ title: t.notFound.metaTitle, noindex: true });
  // The question mark drops in with a little tilt, as if it is puzzled too.
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap
          .timeline()
          .from('[data-puzzled]', {
            y: -30,
            scale: 0.6,
            opacity: 0,
            duration: 0.6,
            ease: 'back.out(2)',
          })
          .to('[data-puzzled]', {
            rotation: -10,
            duration: 0.25,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: 3,
          });
      });
    },
    { scope: root },
  );
  return (
    <main
      ref={root}
      className="grid min-h-[60dvh] place-items-center px-4 py-12 text-center md:px-8"
    >
      <div>
        <p
          aria-hidden="true"
          data-puzzled
          className="mx-auto mb-6 grid h-28 w-28 place-items-center rounded-full bg-secondary font-display text-7xl font-semibold text-secondary-fg shadow-edge-sun"
        >
          ?
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-content md:text-4xl">
          {t.notFound.title}
        </h1>
        <p className="mx-auto mb-8 mt-3 max-w-xs text-content-muted">{t.notFound.body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className={buttonClasses('primary')}>
            {t.common.findAQuiz}
          </Link>
          <Link to="/daily" className={buttonClasses('ghost')}>
            {t.common.todaysChallenge}
          </Link>
        </div>
      </div>
    </main>
  );
}
