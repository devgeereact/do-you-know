import { Link } from 'react-router-dom';
import { Character } from '@/components/art/Art';
import { useSwitches } from '@/hooks/useSwitches';
import { LEARN_AREAS } from '@/lib/learnAreas';
import { cn } from '@/lib/utils';
import type { LearnArea } from '@/types/game';
import { t } from '@/i18n';

const tile =
  'grid h-full min-h-[9rem] w-full content-center justify-items-center gap-1 rounded-[1.4rem] p-4 text-center transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary';

/**
 * Four big tiles, one for each area. For a child a parent has set up they start a learning session
 * (saved steps need a parent account). Everyone else gets the same four as a way to browse: a tap
 * narrows the quiz list to that area, and a second tap clears it.
 */
export function LearnTiles({
  area = null,
  onPick,
}: {
  area?: LearnArea | null;
  onPick?: (next: LearnArea | null) => void;
}): JSX.Element | null {
  const { level } = useSwitches();
  const child = Boolean(level);
  if (!child && !onPick) return null;
  return (
    <section aria-labelledby="learn-title" className="mx-auto w-full max-w-6xl px-4 pt-6 lg:px-6">
      <h2 id="learn-title" className="text-2xl">
        {child ? t.learn.title : t.learn.browseTitle}
      </h2>
      <p className="mb-3 text-content-muted">{child ? t.learn.lead : t.learn.browseLead}</p>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {LEARN_AREAS.map((a) => (
          <li key={a.id}>
            {child ? (
              <Link
                to={`/learn/${a.id}`}
                aria-label={t.learn.startArea(a.name)}
                className={cn(tile, 'bg-primary/10')}
              >
                <Character name={a.character} size={64} />
                <span className="text-xl font-medium">{a.name}</span>
                <span className="text-sm text-content-muted">{a.lead}</span>
              </Link>
            ) : (
              <button
                type="button"
                aria-pressed={area === a.id}
                onClick={() => onPick?.(area === a.id ? null : a.id)}
                className={cn(tile, area === a.id ? 'bg-primary text-primary-fg' : 'bg-primary/10')}
              >
                <Character name={a.character} size={64} />
                <span className="text-xl font-medium">{a.name}</span>
                <span
                  className={cn(
                    'text-sm',
                    area === a.id ? 'text-primary-fg/90' : 'text-content-muted',
                  )}
                >
                  {a.lead}
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
