import { Link } from 'react-router-dom';
import { Character } from '@/components/art/Art';
import { useSwitches } from '@/hooks/useSwitches';
import { LEARN_AREAS } from '@/lib/learnAreas';
import { t } from '@/i18n';

/**
 * Four big tiles, one for each area, for a child a parent has set up. A guest sees nothing here: saved
 * steps need a parent account, and the rest of the home page is theirs as before.
 */
export function LearnTiles(): JSX.Element | null {
  const { level } = useSwitches();
  if (!level) return null;
  return (
    <section aria-labelledby="learn-title" className="mx-auto w-full max-w-6xl px-4 pt-6 lg:px-6">
      <h2 id="learn-title" className="text-2xl">
        {t.learn.title}
      </h2>
      <p className="mb-3 text-content-muted">{t.learn.lead}</p>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {LEARN_AREAS.map((a) => (
          <li key={a.id}>
            <Link
              to={`/learn/${a.id}`}
              aria-label={t.learn.startArea(a.name)}
              className="grid h-full min-h-[9rem] content-center justify-items-center gap-1 rounded-[1.4rem] bg-primary/10 p-4 text-center transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
            >
              <Character name={a.character} size={64} />
              <span className="text-xl font-medium">{a.name}</span>
              <span className="text-sm text-content-muted">{a.lead}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
