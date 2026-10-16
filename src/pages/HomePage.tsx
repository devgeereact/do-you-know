import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { QuizCard } from '@/components/game/QuizCard';

// A taste of the game, not a live question: nothing here is marked right or wrong,
// so no answer reaches the browser (see AGENTS.md §8).
const TEASER = {
  category: 'Science & Nature',
  prompt: 'How many hearts does an octopus have?',
  options: ['One', 'Two', 'Three', 'Eight'],
} as const;

export function HomePage(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { categories, quizzes, loading, error, refresh } = useQuizCatalog();
  const daily = useDailyChallenge();

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, ease: 'easeOut', delay },
        };

  return (
    <main className="overflow-x-clip">
      <div className="mx-auto grid min-h-[85dvh] max-w-5xl items-center gap-12 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:px-8 landscape:max-md:grid-cols-2 landscape:max-md:gap-6 landscape:max-md:py-6">
        <motion.section {...rise(0)} className="text-center md:text-left">
          <div className="mb-6 flex items-center justify-center gap-3 md:justify-start">
            <img
              src={`${import.meta.env.BASE_URL}favicon.svg`}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <span className="font-display text-xl font-semibold text-content">Do You Know</span>
          </div>

          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-content md:text-6xl">
            Quick quizzes for <span className="text-primary">curious</span> minds
          </h1>
          <p className="mx-auto mt-5 max-w-md text-pretty text-lg text-content-muted md:mx-0">
            Play in seconds with no sign-up. Every answer comes with a short explanation, so you
            learn something either way. Try today’s challenge, then dare a friend to beat you.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <a href="#quizzes" className={buttonClasses('primary', 'lg')}>
              Play a quiz
            </a>
            <Link to="/me" className={buttonClasses('ghost', 'lg')}>
              My games
            </Link>
          </div>
          <p className="mt-4 text-sm text-content-muted">
            No account needed to play. Built to be safe for kids.
          </p>
        </motion.section>

        <motion.figure
          {...rise(0.08)}
          aria-label="Example question"
          className="relative mx-auto w-full max-w-sm"
        >
          <div
            aria-hidden="true"
            className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary motion-safe:animate-[float_6s_ease-in-out_infinite]"
          />
          <div className="relative rounded-2xl border-2 border-surface-border bg-surface p-6 shadow-lift">
            <figcaption className="mb-4 flex items-center justify-between text-sm font-bold">
              <span className="rounded-full bg-background px-3 py-1 text-primary">
                {TEASER.category}
              </span>
              <span className="text-content-muted">Question 3 of 10</span>
            </figcaption>
            <p className="mb-5 font-display text-2xl font-semibold leading-snug text-content">
              {TEASER.prompt}
            </p>
            <ul className="grid grid-cols-2 gap-3">
              {TEASER.options.map((option) => (
                <li
                  key={option}
                  className="flex min-h-[3.5rem] items-center justify-center rounded-full border-2 border-surface-border bg-background px-4 font-display text-lg font-semibold text-content"
                >
                  {option}
                </li>
              ))}
            </ul>
          </div>
        </motion.figure>
      </div>

      <section id="quizzes" className="mx-auto max-w-5xl scroll-mt-4 px-4 pb-16 md:px-8">
        {daily.today && (
          <Link
            to="/daily"
            className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-6 text-secondary-fg shadow-edge-sun transition-transform duration-[120ms] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>
              <span className="block text-sm font-bold uppercase tracking-wide">
                Today’s challenge
              </span>
              <span className="block font-display text-2xl font-semibold">
                {daily.today.quiz.title}
              </span>
              {daily.streak > 0 && (
                <span className="block text-sm font-bold">
                  Streak: {daily.streak} {daily.streak === 1 ? 'day' : 'days'}
                </span>
              )}
            </span>
            <span className="font-display text-lg font-semibold">
              {daily.playedToday ? '✓ Done today' : 'Play →'}
            </span>
          </Link>
        )}

        <h2 className="text-3xl font-semibold text-content">Pick a quiz</h2>

        {categories.length > 0 && (
          <nav aria-label="Categories" className="mt-5">
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/c/${category.slug}`}
                    className="inline-flex min-h-tap items-center rounded-full border-2 border-surface-border bg-surface px-4 font-semibold text-content hover:border-primary/40"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {loading && (
          <p role="status" className="mt-8 text-content-muted">
            Loading quizzes…
          </p>
        )}
        {error && (
          <div role="alert" className="mt-8">
            <p className="text-content">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className={buttonClasses('ghost', 'md', 'mt-3')}
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && quizzes.length === 0 && (
          <p className="mt-8 text-content-muted">New quizzes are on their way. Pop back soon!</p>
        )}

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.slice(0, 9).map((quiz) => (
            <li key={quiz.id}>
              <QuizCard quiz={quiz} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
