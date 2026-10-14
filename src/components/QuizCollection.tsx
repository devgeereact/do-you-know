import { copy } from '@/lib/copy';
import { useState } from 'react';
import type { CatalogQuiz } from '@/services/catalogService';
import type { CurriculumTag } from '@/types';
import { QuizCard } from '@/components/QuizCard';

const AGE_BANDS = [
  { value: 'all', label: copy.catalog.bands[0], min: 0, max: Infinity },
  { value: '6-8', label: copy.catalog.bands[1], min: 6, max: 8 },
  { value: '9-11', label: copy.catalog.bands[2], min: 9, max: 11 },
  { value: '12-14', label: copy.catalog.bands[3], min: 12, max: 14 },
  { value: '15-16', label: copy.catalog.bands[4], min: 15, max: 16 },
  { value: 'adult', label: copy.catalog.bands[5], min: 18, max: Infinity },
];
interface QuizCollectionProps {
  quizzes: CatalogQuiz[];
  curriculumTags: CurriculumTag[];
}

export function QuizCollection({ quizzes, curriculumTags }: QuizCollectionProps): JSX.Element {
  const [ageBand, setAgeBand] = useState('all');
  const [curriculum, setCurriculum] = useState('all');
  const band = AGE_BANDS.find((item) => item.value === ageBand) ?? AGE_BANDS[0];
  const matching = quizzes.filter(
    (quiz) =>
      band &&
      (quiz.age_min ?? 0) <= band.max &&
      (quiz.age_max ?? Infinity) >= band.min &&
      (curriculum === 'all' || quiz.curriculum_tags.includes(curriculum)),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <label className="grid flex-1 gap-2 font-bold text-content sm:flex-none">
          {copy.catalog.ageGroup}
          <select
            value={ageBand}
            onChange={(event) => setAgeBand(event.target.value)}
            className="min-h-tap rounded-xl border-2 border-surface-border bg-surface px-4 text-base text-content"
          >
            {AGE_BANDS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid flex-1 gap-2 font-bold text-content sm:flex-none">
          {copy.catalog.curriculum}
          <select
            value={curriculum}
            onChange={(event) => setCurriculum(event.target.value)}
            className="min-h-tap max-w-full rounded-xl border-2 border-surface-border bg-surface px-4 text-base text-content sm:max-w-sm"
          >
            <option value="all">{copy.catalog.allCurricula}</option>
            {curriculumTags.map((tag) => (
              <option key={tag.code} value={tag.code}>
                {tag.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status" className="mb-4 text-base text-content-muted">
        {copy.catalog.count(matching.length)}
      </p>
      {matching.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {matching.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border-2 border-surface-border bg-surface p-6 text-content">
          {copy.catalog.empty}
        </p>
      )}
    </div>
  );
}
