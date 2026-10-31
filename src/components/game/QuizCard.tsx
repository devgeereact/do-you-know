import { Link } from 'react-router-dom';
import { Character } from '@/components/art/Art';
import { WORLD_BG } from '@/lib/art';
import { ageLabel, difficultyLabel } from '@/lib/quizLabels';
import { cn } from '@/lib/utils';
import { categoryStyle } from '@/lib/categoryStyle';
import { cardLinkClass } from '@/components/ui/cardClasses';
import type { Quiz } from '@/types';
import { t } from '@/i18n';

const DIFFICULTY_CHIP: Record<Quiz['difficulty'], string> = {
  easy: 'bg-correct/10 text-correct dark:text-content',
  medium: 'bg-secondary/40 text-content',
  hard: 'bg-wrong/10 text-wrong dark:text-content',
};

/**
 * A quiz in a list: one even row (the same height in every grid), the whole row a link to the
 * quiz page. The tile shows the subject's character on its home world's colours.
 */
export function QuizCard({
  quiz,
  categorySlug,
  best,
}: {
  quiz: Quiz;
  categorySlug?: string;
  /** Best percentage this player has scored, shown as a ring. */
  best?: number | null;
}): JSX.Element {
  const style = categoryStyle(categorySlug);
  const world = WORLD_BG[style.world];
  const age = ageLabel(quiz);
  return (
    <Link
      to={`/q/${quiz.slug}`}
      className={cn(cardLinkClass, 'group flex h-full min-h-[5rem] items-center gap-4 p-3 pr-4')}
    >
      <span
        aria-hidden="true"
        className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl transition-transform duration-300 ease-out group-hover:-rotate-3 group-hover:scale-105"
        style={{ background: `linear-gradient(160deg, ${world.b}, ${world.a})` }}
      >
        <Character name={style.character} size={46} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-sans text-base font-bold leading-snug text-content group-hover:text-primary">
          {quiz.title}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-content-muted">
          <span className="rounded-full bg-background px-2 py-0.5">
            {t.common.questionCount(quiz.question_count)}
          </span>
          <span className={cn('rounded-full px-2 py-0.5', DIFFICULTY_CHIP[quiz.difficulty])}>
            {difficultyLabel(quiz.difficulty)}
          </span>
          {age && <span className="rounded-full bg-background px-2 py-0.5">{age}</span>}
        </p>
      </div>
      {typeof best === 'number' ? (
        <ScoreRing value={best} />
      ) : (
        <span
          aria-hidden="true"
          className="font-display text-xl font-extrabold text-primary transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      )}
    </Link>
  );
}

/** Best score as a small ring with the number inside; the label is real text for screen readers. */
export function ScoreRing({ value }: { value: number }): JSX.Element {
  const colour =
    value >= 70 ? 'rgb(var(--correct))' : value >= 40 ? 'rgb(var(--primary))' : 'rgb(var(--tang))';
  return (
    <svg
      viewBox="0 0 36 36"
      className="h-11 w-11 shrink-0"
      role="img"
      aria-label={t.home.bestScore(value)}
    >
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke="rgb(var(--surface-border))"
        strokeWidth="4"
      />
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke={colour}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${value * 0.942} 100`}
        transform="rotate(-90 18 18)"
      />
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fill="rgb(var(--content))"
      >
        {value}%
      </text>
    </svg>
  );
}
