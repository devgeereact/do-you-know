import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useFriendChallenge } from '@/hooks/useFriendChallenge';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Card } from '@/components/ui/Card';
import { Page } from '@/components/ui/Page';
import { t } from '@/i18n';

/** A friend's challenge: nickname and score only, then the exact same questions. */
export function ChallengePage(): JSX.Element {
  const { code = '' } = useParams<{ code: string }>();
  const { preview, loading, error } = useFriendChallenge(code);

  useDocumentMeta({ title: t.challenge.metaTitle, noindex: true });

  const usable = preview !== null && !preview.expired;

  // The friend's avatar pops in, then the dare and the button rise after it.
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!usable) return;
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap
          .timeline()
          .from('[data-dare-card]', { y: 24, scale: 0.97, opacity: 0, duration: 0.5 })
          .from(
            '[data-dare-avatar]',
            { scale: 0.4, opacity: 0, duration: 0.5, ease: 'back.out(2.2)' },
            0.15,
          )
          .from('[data-dare-rise]', { y: 14, opacity: 0, duration: 0.4, stagger: 0.08 }, 0.3);
      });
    },
    { scope: root, dependencies: [usable] },
  );

  return (
    <div ref={root}>
      <Page className="text-center">
        {loading && (
          <p role="status" className="py-16 text-content-muted">
            {t.challenge.loading}
          </p>
        )}

        {!loading && !usable && (
          <div className="py-10">
            <h1 className="text-3xl font-semibold tracking-tight text-content md:text-4xl">
              {t.challenge.notFound}
            </h1>
            <p role="alert" className="mx-auto mb-6 mt-3 max-w-xs text-content-muted">
              {error ?? t.errors.game.challenge_not_found}
            </p>
            <Link to="/" className={buttonClasses('primary')}>
              {t.common.findAQuiz}
            </Link>
          </div>
        )}

        {usable && (
          <Card as="article" data-dare-card className="mx-auto max-w-xl shadow-lift md:p-10">
            <div data-dare-avatar className="flex justify-center">
              <AvatarBadge
                avatarId={preview.creator.avatar_id}
                nickname={preview.creator.nickname}
                size="lg"
              />
            </div>
            <p className="mt-4 inline-block rounded-full bg-background px-3 py-1 text-sm font-bold text-content-muted">
              {preview.quiz.title}
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-content md:text-4xl">
              {t.challenge.scored(preview.creator.nickname, preview.creator_correct, preview.total)}
              <span className="block text-primary">{t.challenge.canYouBeatIt}</span>
            </h1>
            <p data-dare-rise className="mx-auto mt-3 max-w-sm text-content-muted">
              {t.challenge.sameQuestions}
            </p>
            <Link
              data-dare-rise
              to={`/challenge/${preview.code}/play`}
              className={buttonClasses('primary', 'lg', 'mt-6')}
            >
              {t.challenge.accept}
            </Link>
          </Card>
        )}
      </Page>
    </div>
  );
}
