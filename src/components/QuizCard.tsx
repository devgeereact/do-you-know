import { copy } from '@/lib/copy';
import { Link } from 'react-router-dom';
import type { CatalogQuiz } from '@/services/catalogService';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/buttonClasses';

export function QuizCard({ quiz }: { quiz: CatalogQuiz }): JSX.Element {
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-base font-bold text-content-muted">
        <span className="rounded-full bg-background px-3 py-1 capitalize">{quiz.difficulty}</span>
        <span>{copy.catalog.questionCount(quiz.question_count)}</span>
      </div>
      <h3 className="font-display text-2xl font-semibold text-content">{quiz.title}</h3>
      <p className="line-clamp-3 text-base text-content-muted">
        {quiz.intro ?? copy.catalog.fallbackIntro}
      </p>
      <Link to={`/q/${quiz.slug}`} className={buttonClasses('primary', 'md', 'mt-auto self-start')}>
        {copy.catalog.explore} <span aria-hidden="true">→</span>
      </Link>
    </Card>
  );
}
