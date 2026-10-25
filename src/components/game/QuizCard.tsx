import { Link } from 'react-router-dom';
import { ageLabel, difficultyLabel } from '@/lib/quizLabels';
import { cn, isWebUrl } from '@/lib/utils';
import { categoryStyle } from '@/lib/categoryStyle';
import { cardLinkClass } from '@/components/ui/cardClasses';
import type { Quiz } from '@/types';
import { t } from '@/i18n';

const DIFFICULTY_CHIP: Record<Quiz['difficulty'], string> = {
  easy: 'bg-correct/15 text-correct dark:text-content',
  medium: 'bg-secondary/40 text-content',
  hard: 'bg-wrong/15 text-wrong dark:text-content',
};

/**
 * A quiz in a list. The whole card is one link to the quiz landing page. `categorySlug`
 * picks the card's picture and colour; without it the card shows the quiz's initial.
 */
export function QuizCard({
  quiz,
  categorySlug,
}: {
  quiz: Quiz;
  categorySlug?: string;
}): JSX.Element {
  const style = categorySlug ? categoryStyle(categorySlug) : null;
  const age = ageLabel(quiz);
  const cover = isWebUrl(quiz.cover_image_url) ? quiz.cover_image_url : null;
  const meta = (
    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold text-content-muted">
      <span className="rounded-full bg-background px-2 py-0.5">
        {t.common.questionCount(quiz.question_count)}
      </span>
      <span className={cn('rounded-full px-2 py-0.5', DIFFICULTY_CHIP[quiz.difficulty])}>
        {difficultyLabel(quiz.difficulty)}
      </span>
      {age && <span className="rounded-full bg-background px-2 py-0.5">{age}</span>}
    </p>
  );
  const linkClass = cn(cardLinkClass, 'group h-full overflow-hidden');

  // No cover art: a compact row, so a list of quizzes stays scannable on a phone.
  if (!cover) {
    return (
      <Link to={`/q/${quiz.slug}`} className={cn(linkClass, 'flex items-center gap-4 p-4')}>
        <span
          aria-hidden="true"
          className={cn(
            'grid h-14 w-14 shrink-0 place-items-center rounded-xl font-display text-2xl font-semibold text-primary transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110',
            style ? style.tile : 'bg-sky/30',
          )}
        >
          {style ? style.emoji : quiz.title.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-snug text-content group-hover:text-primary">
            {quiz.title}
          </h3>
          {meta}
        </div>
        <span
          aria-hidden="true"
          className="font-display text-xl font-semibold text-primary transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </Link>
    );
  }

  return (
    <Link to={`/q/${quiz.slug}`} className={cn(linkClass, 'flex flex-col')}>
      <span className="block overflow-hidden">
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </span>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold leading-snug text-content group-hover:text-primary">
          {quiz.title}
        </h3>
        <div className="mt-auto pt-3">{meta}</div>
      </div>
    </Link>
  );
}
