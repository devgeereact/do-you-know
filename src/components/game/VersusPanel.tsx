import { useRef } from 'react';
import type { AttemptSummary } from '@/types/game';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { t } from '@/i18n';

interface VersusPanelProps {
  versus: NonNullable<AttemptSummary['versus']>;
  correct: number;
  total: number;
  answerTimeMs: number;
}

/** Head-to-head result for a friend challenge. The server decides who won. */
export function VersusPanel({
  versus,
  correct,
  total,
  answerTimeMs,
}: VersusPanelProps): JSX.Element {
  const headline = versus.tie
    ? t.results.versus.tie
    : versus.you_won
      ? t.results.versus.youWon(versus.creator_nickname)
      : t.results.versus.theyWon(versus.creator_nickname);

  // The two scores slide in from either side and meet in the middle.
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.from('[data-versus-side="you"]', { x: -24, opacity: 0, duration: 0.5, delay: 0.2 });
        gsap.from('[data-versus-side="them"]', { x: 24, opacity: 0, duration: 0.5, delay: 0.2 });
      });
    },
    { scope: root },
  );
  const tile = (winner: boolean): string =>
    cn(
      'rounded-xl border-2 bg-background p-4',
      winner && !versus.tie ? 'border-correct' : 'border-transparent',
    );

  return (
    <div ref={root}>
      <Card as="section" aria-label={t.results.versus.label} className="mt-6 text-center">
        <h2 className="text-2xl font-semibold text-content">{headline}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div data-versus-side="you" className={tile(versus.you_won)}>
            <p className="text-sm font-bold text-content-muted">{t.common.you}</p>
            <p className="font-display text-3xl font-semibold text-content">
              {correct}/{total}
            </p>
            <p className="text-xs text-content-muted">{t.common.seconds(answerTimeMs)}</p>
          </div>
          <div data-versus-side="them" className={tile(!versus.you_won)}>
            <p className="truncate text-sm font-bold text-content-muted">
              {versus.creator_nickname}
            </p>
            <p className="font-display text-3xl font-semibold text-content">
              {versus.creator_correct}/{total}
            </p>
            <p className="text-xs text-content-muted">{t.common.seconds(versus.creator_time_ms)}</p>
          </div>
        </div>
        {!versus.tie && versus.creator_correct === correct && (
          <p className="mt-3 text-sm text-content-muted">{t.results.versus.sameScore}</p>
        )}
      </Card>
    </div>
  );
}
