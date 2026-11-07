import { Link } from 'react-router-dom';
import { Character } from '@/components/art/Art';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { areaName } from '@/lib/learnAreas';
import { STICKER_ART } from '@/lib/stickers';
import { cn } from '@/lib/utils';
import type { LearnSummary } from '@/types/game';
import { t } from '@/i18n';

/** The end of a learning session: stars, how the step moved, a sticker and one next thing to do. */
export function LearnEnd({ learn }: { learn: LearnSummary }): JSX.Element {
  const step =
    learn.stepped === 'up'
      ? t.learn.stepUp(learn.step_after)
      : learn.stepped === 'down'
        ? t.learn.stepDown(learn.step_after)
        : t.learn.stepStay(learn.step_after);
  return (
    <section
      data-results-rise
      aria-label={t.learn.title}
      className="mx-auto mt-6 grid max-w-md gap-4 rounded-2xl border border-surface-border bg-surface p-5 text-center shadow-soft"
    >
      <p
        role="img"
        aria-label={t.learn.stars(learn.stars)}
        className="flex justify-center gap-2 text-4xl"
      >
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            aria-hidden="true"
            className={cn(n <= learn.stars ? 'text-lemon' : 'text-surface-border')}
          >
            ★
          </span>
        ))}
      </p>
      <p className="text-lg text-content">{step}</p>
      {learn.sticker && (
        <div className="grid justify-items-center gap-1 rounded-xl bg-background p-3">
          <p className="text-sm text-content-muted">{t.learn.newSticker}</p>
          <Character name={STICKER_ART[learn.sticker.id] ?? 'star'} size={72} />
          <p className="text-lg font-medium text-content">{learn.sticker.label}</p>
        </div>
      )}
      <p className="text-sm text-content-muted">{t.learn.comeBack}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to={`/learn/${learn.next_area}`} className={buttonClasses('primary', 'lg')}>
          {t.learn.practiseNext(areaName(learn.next_area))}
        </Link>
      </div>
    </section>
  );
}
