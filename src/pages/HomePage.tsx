import { copy } from '@/lib/copy';
import { Link } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { CatalogStatus } from '@/components/CatalogStatus';
import { QuizCollection } from '@/components/QuizCollection';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';

export function HomePage(): JSX.Element {
  const catalog = useQuizCatalog();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <section className="grid items-center gap-8 py-10 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <p className="mb-4 font-bold text-primary">{copy.home.eyebrow}</p>
            <h1 className="max-w-xl text-balance font-display text-5xl font-semibold leading-tight text-content md:text-6xl">
              {copy.home.title} <span className="text-primary">{copy.home.titleAccent}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-content-muted">{copy.home.intro}</p>
            <a href="#quizzes" className={buttonClasses('secondary', 'lg', 'mt-7')}>
              {copy.home.findQuiz} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border-2 border-surface-border bg-surface p-8">
            <div
              aria-hidden="true"
              className="absolute -right-6 -top-6 h-36 w-36 rounded-full bg-secondary"
            />
            <div className="relative text-center">
              <span aria-hidden="true" className="block text-7xl">
                🚀
              </span>
              <p className="mt-5 font-display text-3xl font-semibold text-content">
                {copy.home.sceneTitle}
                <br />
                {copy.home.sceneSubtitle}
              </p>
              <p className="mt-3 text-base text-content-muted">{copy.home.sceneIntro}</p>
            </div>
          </div>
        </section>
        <section
          id="quizzes"
          aria-labelledby="quizzes-heading"
          className="scroll-mt-5 border-t-2 border-surface-border pt-8"
        >
          <h2
            id="quizzes-heading"
            className="mb-2 font-display text-3xl font-semibold text-content"
          >
            {copy.home.heading}
          </h2>
          <p className="mb-6 text-lg text-content-muted">{copy.home.subheading}</p>
          <CatalogStatus {...catalog} />
          {!catalog.loading && !catalog.error && (
            <>
              <nav aria-label={copy.catalog.categoryLabel} className="mb-8 flex flex-wrap gap-3">
                {catalog.categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/c/${category.slug}`}
                    className={buttonClasses('ghost', 'md')}
                  >
                    <span aria-hidden="true">{category.icon ?? '✦'}</span>
                    {category.name}
                  </Link>
                ))}
              </nav>
              <QuizCollection quizzes={catalog.quizzes} curriculumTags={catalog.curriculumTags} />
            </>
          )}
        </section>
      </main>
    </>
  );
}
