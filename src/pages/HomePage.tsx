import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

// A taste of the game, not a live question: nothing here is marked right or wrong,
// so no answer reaches the browser (see AGENTS.md §8).
const TEASER = {
  category: 'Science & Nature',
  prompt: 'How many hearts does an octopus have?',
  options: ['One', 'Two', 'Three', 'Eight'],
} as const;

export function HomePage(): JSX.Element {
  const { user } = useSupabaseAuth();
  const signedIn = user !== null && user.is_anonymous !== true;
  const reduceMotion = useReducedMotion();

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, ease: 'easeOut', delay },
        };

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl overflow-x-clip items-center gap-12 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:px-8 landscape:max-md:grid-cols-2 landscape:max-md:gap-6 landscape:max-md:py-6">
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
          Play in seconds with no sign-up. Every answer comes with a short explanation, so you learn
          something either way. Try today’s challenge, then dare a friend to beat you.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
          {signedIn ? (
            <Link to="/dashboard" className={buttonClasses('primary', 'lg')}>
              My profile
            </Link>
          ) : (
            <Link to="/login" className={buttonClasses('primary', 'lg')}>
              Save my progress
            </Link>
          )}
        </div>
        <p className="mt-4 text-sm text-content-muted">No account needed to play. Built to be safe for kids.</p>
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
    </main>
  );
}
