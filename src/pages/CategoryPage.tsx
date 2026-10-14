import { copy } from '@/lib/copy';
import { Link, useParams } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { CatalogStatus } from '@/components/CatalogStatus';
import { QuizCollection } from '@/components/QuizCollection';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function CategoryPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const catalog = useQuizCatalog({ categorySlug: slug });
  const category = catalog.categories.find((item) => item.slug === slug);
  if (!catalog.loading && !catalog.error && !category) return <NotFoundPage />;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
        <Link to="/" className="inline-flex min-h-tap items-center font-bold text-primary">
          ← {copy.catalog.allQuizzes}
        </Link>
        <h1 className="mt-5 font-display text-4xl font-semibold text-content">
          {category?.name ?? copy.catalog.topic}
        </h1>
        <p className="mb-8 mt-4 max-w-2xl text-lg text-content-muted">{category?.description}</p>
        <CatalogStatus {...catalog} />
        {!catalog.loading && !catalog.error && (
          <QuizCollection quizzes={catalog.quizzes} curriculumTags={catalog.curriculumTags} />
        )}
      </main>
    </>
  );
}
