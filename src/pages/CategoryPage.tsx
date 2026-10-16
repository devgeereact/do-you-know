import { useParams, useSearchParams } from 'react-router-dom';
import { QuizCard } from '@/components/game/QuizCard';
import { BackLink } from '@/components/BackLink';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { Button } from '@/components/ui/Button';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Age chips map to one representative age; quizzes match when it falls in their range.
const AGE_CHIPS = [
  { label: 'All ages', age: undefined },
  { label: '5–7', age: 6 },
  { label: '8–10', age: 9 },
  { label: '11–13', age: 12 },
  { label: '14+', age: 15 },
] as const;

export function CategoryPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const ageParam = params.get('age');
  const parsedAge = ageParam ? Number(ageParam) : NaN;
  const age = Number.isFinite(parsedAge) ? parsedAge : undefined;
  const curriculumTag = params.get('curriculum') ?? undefined;

  const { categories, quizzes, curriculumTags, loading, error, refresh } = useQuizCatalog({
    categorySlug: slug,
    age,
    curriculumTag,
  });
  const category = categories.find((c) => c.slug === slug) ?? null;

  useDocumentMeta({
    title: category ? `${category.name} quizzes` : 'Quizzes',
    description: category?.description ?? undefined,
  });

  // An unknown slug gets the real not-found page, not an empty category.
  if (!loading && !error && !category) return <NotFoundPage />;

  const setFilter = (key: 'age' | 'curriculum', value: string | undefined): void => {
    const next = new URLSearchParams(params);
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 md:px-8">
        <BackLink to="/" label="All quizzes" />
        <h1 className="mt-2 text-4xl font-semibold text-content md:text-5xl">
          {category?.name ?? 'Quizzes'}
        </h1>
        {category?.description && (
          <p className="mt-3 max-w-prose text-lg text-content-muted">{category.description}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Age">
          {AGE_CHIPS.map((chip) => {
            const active = chip.age === age;
            return (
              <button
                key={chip.label}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter('age', chip.age?.toString())}
                className={cn(
                  'min-h-tap rounded-full border-2 px-4 font-semibold',
                  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active
                    ? 'border-primary bg-primary text-primary-fg'
                    : 'border-surface-border bg-surface text-content',
                )}
              >
                {chip.label}
              </button>
            );
          })}

          {category?.kind === 'school' && curriculumTags.length > 0 && (
            <label className="flex items-center gap-2 text-sm font-bold text-content-muted sm:ml-auto">
              School year
              <select
                value={curriculumTag ?? ''}
                onChange={(e) => setFilter('curriculum', e.target.value)}
                className="min-h-tap rounded-full border-2 border-surface-border bg-surface px-3 text-base font-semibold text-content"
              >
                <option value="">Any</option>
                {curriculumTags.map((tag) => (
                  <option key={tag.code} value={tag.code}>
                    {tag.system}: {tag.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && (
          <div role="alert" className="mt-10 text-center">
            <p className="text-content">{error}</p>
            <Button className="mt-4" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        )}
        {loading && (
          <p role="status" className="mt-10 text-center text-content-muted">
            Loading quizzes…
          </p>
        )}
        {!loading && !error && quizzes.length === 0 && (
          <p className="mt-10 text-center text-content-muted">
            No quizzes here yet. Try another age, or pop back soon!
          </p>
        )}

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <QuizCard quiz={quiz} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
