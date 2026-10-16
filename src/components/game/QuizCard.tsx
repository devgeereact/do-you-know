import { Link } from 'react-router-dom';
import { ageLabel, difficultyLabel } from '@/lib/quizLabels';
import { isWebUrl } from '@/lib/utils';
import type { Quiz } from '@/types';

/** A quiz in a list. The whole card is one link to the quiz landing page. */
export function QuizCard({ quiz }: { quiz: Quiz }): JSX.Element {
  const age = ageLabel(quiz);
  const cover = isWebUrl(quiz.cover_image_url) ? quiz.cover_image_url : null;
  const meta = (
    <p className="flex flex-wrap gap-x-2 text-sm font-bold text-content-muted">
      <span>{quiz.question_count} questions</span>
      <span aria-hidden="true">·</span>
      <span>{difficultyLabel(quiz.difficulty)}</span>
      {age && (
        <>
          <span aria-hidden="true">·</span>
          <span>{age}</span>
        </>
      )}
    </p>
  );
  const linkClass =
    'group h-full overflow-hidden rounded-xl border-2 border-surface-border bg-surface transition-[transform,border-color] duration-[120ms] hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  // No cover art: a compact row, so a list of quizzes stays scannable on a phone.
  if (!cover) {
    return (
      <Link to={`/q/${quiz.slug}`} className={`${linkClass} flex items-center gap-4 p-4`}>
        <span
          aria-hidden="true"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-sky/30 font-display text-2xl font-semibold text-primary"
        >
          {quiz.title.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-snug text-content group-hover:text-primary">
            {quiz.title}
          </h3>
          {meta}
        </div>
        <span aria-hidden="true" className="font-display text-xl font-semibold text-primary">
          →
        </span>
      </Link>
    );
  }

  return (
    <Link to={`/q/${quiz.slug}`} className={`${linkClass} flex flex-col`}>
      <img src={cover} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold leading-snug text-content group-hover:text-primary">
          {quiz.title}
        </h3>
        <div className="mt-auto pt-3">{meta}</div>
      </div>
    </Link>
  );
}
