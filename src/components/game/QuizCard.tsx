import { Link } from 'react-router-dom';
import { ageLabel, difficultyLabel } from '@/lib/quizLabels';
import { isWebUrl } from '@/lib/utils';
import type { Quiz } from '@/types';

/** A quiz in a list. The whole card is one link to the quiz landing page. */
export function QuizCard({ quiz }: { quiz: Quiz }): JSX.Element {
  const age = ageLabel(quiz);
  return (
    <Link
      to={`/q/${quiz.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border-2 border-surface-border bg-surface transition-[transform,border-color] duration-[120ms] hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {isWebUrl(quiz.cover_image_url) ? (
        <img
          src={quiz.cover_image_url}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div aria-hidden="true" className="grid aspect-[16/9] w-full place-items-center bg-sky/30">
          <span className="font-display text-5xl font-semibold text-primary">?</span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold leading-snug text-content group-hover:text-primary">
          {quiz.title}
        </h3>
        <p className="mt-auto flex flex-wrap gap-2 pt-3 text-sm font-bold text-content-muted">
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
      </div>
    </Link>
  );
}
