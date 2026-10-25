import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useReveal } from '@/hooks/useReveal';
import { categoryStyle } from '@/lib/categoryStyle';
import { QuizCard } from '@/components/game/QuizCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { chipClass, fullRows } from '@/components/ui/cardClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { Button } from '@/components/ui/Button';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { Page } from '@/components/ui/Page';
import { AGE_BANDS } from '@/lib/ageBands';
import { t } from '@/i18n';

const AGE_CHIPS = [{ label: t.category.ageChips.all, age: undefined }, ...AGE_BANDS] as const;

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
    title: category ? t.category.metaTitle(category.name) : t.category.fallbackTitle,
    description: category?.description ?? undefined,
  });

  const list = useRef<HTMLUListElement>(null);
  useReveal(list, [quizzes]);

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
      <Page width="wide">
        <PageHeader
          back={{ to: '/', label: t.common.allQuizzes }}
          icon={
            category && (
              <span
                aria-hidden="true"
                className={cn(
                  'grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl md:h-16 md:w-16',
                  categoryStyle(category.slug).tile,
                )}
              >
                {categoryStyle(category.slug).emoji}
              </span>
            )
          }
          title={category?.name ?? t.category.fallbackTitle}
          lead={category?.description ?? undefined}
          className="mb-6"
        />

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t.category.ageLabel}
        >
          {AGE_CHIPS.map((chip) => {
            const active = chip.age === age;
            return (
              <button
                key={chip.label}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter('age', chip.age?.toString())}
                className={chipClass(active)}
              >
                {chip.label}
              </button>
            );
          })}

          {category?.kind === 'school' && curriculumTags.length > 0 && (
            <label className="flex w-full min-w-0 items-center gap-2 text-sm font-bold text-content-muted sm:ml-auto sm:w-auto">
              {t.category.schoolYear}
              <select
                value={curriculumTag ?? ''}
                onChange={(e) => setFilter('curriculum', e.target.value)}
                className="min-h-tap min-w-0 max-w-full flex-1 truncate rounded-full border-2 border-surface-border bg-surface px-3 text-base font-semibold text-content focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary"
              >
                <option value="">{t.category.anyYear}</option>
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
              {t.common.tryAgain}
            </Button>
          </div>
        )}
        {loading && (
          <p role="status" className="mt-10 text-center text-content-muted">
            {t.category.loading}
          </p>
        )}
        {!loading && !error && quizzes.length === 0 && (
          <p className="mt-10 text-center text-content-muted">{t.category.empty}</p>
        )}

        <ul ref={list} className={cn('mt-8', fullRows.quizzes.list)}>
          {quizzes.map((quiz) => (
            <li key={quiz.id} data-reveal className={fullRows.quizzes.item}>
              <QuizCard quiz={quiz} categorySlug={slug} />
            </li>
          ))}
        </ul>
      </Page>
    </>
  );
}
