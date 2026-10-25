import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { cardLinkClass, chipClass, fullRows } from '@/components/ui/cardClasses';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { QuizCard } from '@/components/game/QuizCard';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useTrendingQuizzes } from '@/hooks/useTrendingQuizzes';
import { resumePath, useContinuePlaying } from '@/hooks/useContinuePlaying';
import { useReveal } from '@/hooks/useReveal';
import { HeroTeaser } from '@/components/home/HeroTeaser';
import { gsap, SplitText, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { AGE_BANDS, suitsAge } from '@/lib/ageBands';
import { categoryStyle } from '@/lib/categoryStyle';
import { cn } from '@/lib/utils';
import type { AttemptMode } from '@/types';
import { t } from '@/i18n';

const MODE_LABEL: Record<AttemptMode, string> = t.common.modes;

/** Quizzes shown before "Show all": three tidy rows on desktop. */
const PREVIEW_COUNT = 9;

export function HomePage(): JSX.Element {
  const { categories, quizzes, loading, error, refresh } = useQuizCatalog();
  const daily = useDailyChallenge();
  const trending = useTrendingQuizzes();
  const { items: unfinished } = useContinuePlaying();
  const [age, setAge] = useState<number | null>(null);
  useDocumentMeta({});

  const shown = useMemo(
    () => (age === null ? quizzes : quizzes.filter((quiz) => suitsAge(quiz, age))),
    [quizzes, age],
  );
  // A long list is capped at a tidy grid until the player asks for the rest.
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? shown : shown.slice(0, PREVIEW_COUNT);
  const categorySlug = useMemo(() => new Map(categories.map((c) => [c.id, c.slug])), [categories]);

  const root = useRef<HTMLElement>(null);
  useReveal(root, [
    quizzes.length,
    trending.quizzes.length,
    categories.length,
    unfinished.length,
    age,
    showAll,
  ]);

  // Hero entrance: the headline rises word by word out of masked lines, the squiggle under
  // the accent word draws itself, then the lead and buttons follow.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        SplitText.create('[data-hero-title]', {
          type: 'words,lines',
          mask: 'lines',
          autoSplit: true,
          onSplit(self) {
            // Unsplit afterwards: the line masks would otherwise clip the squiggle.
            return gsap.from(self.words, {
              yPercent: 110,
              duration: 0.9,
              stagger: 0.06,
              ease: 'power4.out',
              onComplete: () => self.revert(),
            });
          },
        });
        tl.from('[data-hero-kicker]', { y: -12, opacity: 0, duration: 0.5 }, 0)
          .fromTo(
            '[data-squiggle]',
            { strokeDashoffset: 320 },
            { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' },
            0.55,
          )
          .from('[data-hero-fade]', { y: 18, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.45);
      });
    },
    { scope: root },
  );

  // "How it works": as the steps arrive, each number pops on in turn and its emoji gives a
  // small hop, so the three steps read as a sequence.
  useGSAP(
    () => {
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap
          .timeline({
            scrollTrigger: { trigger: '[data-steps]', start: 'top 85%', once: true },
            delay: 0.25,
          })
          .from('[data-step-badge]', {
            scale: 0,
            rotation: -120,
            duration: 0.5,
            ease: 'back.out(2.5)',
            stagger: 0.18,
          })
          .to(
            '[data-step-emoji]',
            { y: -10, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1, stagger: 0.18 },
            0.1,
          );
      });
    },
    { scope: root },
  );

  // The daily banner arrives after its request, so its slow sunburst starts then.
  const hasDaily = Boolean(daily.today);
  useGSAP(
    () => {
      if (!hasDaily) return;
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.to('[data-sunburst]', { rotation: 360, duration: 40, ease: 'none', repeat: -1 });
      });
    },
    { scope: root, dependencies: [hasDaily] },
  );

  return (
    <main ref={root} className="overflow-x-clip">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 pb-10 pt-8 md:min-h-[78vh] md:grid-cols-[1.15fr_1fr] md:px-8 md:pb-16 md:pt-12 landscape:max-md:grid-cols-2 landscape:max-md:gap-6 landscape:max-md:py-6">
        <section className="text-center md:text-left">
          <p
            data-hero-kicker
            className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface/80 px-4 py-1.5 text-sm font-bold text-primary backdrop-blur-sm"
          >
            <span aria-hidden="true">✨</span>
            {t.home.kicker}
          </p>
          <h1
            data-hero-title
            className="mt-5 text-balance text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-content sm:text-6xl md:text-[3.6rem] lg:text-7xl"
          >
            {t.home.titleStart}{' '}
            <span className="relative inline-block text-primary">
              {t.home.titleAccent}
              <svg
                aria-hidden="true"
                viewBox="0 0 300 24"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full text-secondary md:h-4"
              >
                <path
                  data-squiggle
                  d="M4 16 C 50 4, 90 22, 140 12 S 240 4, 296 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray="320"
                />
              </svg>
            </span>{' '}
            {t.home.titleEnd}
          </h1>
          <p
            data-hero-fade
            className="mx-auto mt-6 max-w-md text-pretty text-lg text-content-muted md:mx-0"
          >
            {t.home.lead}
          </p>

          <div
            data-hero-fade
            className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start"
          >
            <a href="#quizzes" className={buttonClasses('primary', 'lg')}>
              {t.home.playAQuiz}
            </a>
            {daily.today ? (
              <Link to="/daily" className={buttonClasses('secondary', 'lg')}>
                {t.common.todaysChallenge}
              </Link>
            ) : (
              <Link to="/leaderboards" className={buttonClasses('ghost', 'lg')}>
                {t.home.seeLeaderboards}
              </Link>
            )}
          </div>
          <p data-hero-fade className="mt-4 text-sm text-content-muted">
            {t.home.safety}
          </p>
        </section>

        <HeroTeaser />
      </div>

      <div
        id="quizzes"
        className="mx-auto max-w-5xl scroll-mt-20 space-y-12 px-4 md:space-y-16 pb-8 md:px-8"
      >
        {daily.today && (
          <Link
            to="/daily"
            data-reveal
            className="group relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-secondary p-6 text-secondary-fg shadow-edge-sun transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:p-8"
          >
            <svg
              aria-hidden="true"
              data-sunburst
              viewBox="0 0 200 200"
              className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 text-surface/30"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <path
                  key={i}
                  d="M100 100 L92 0 L108 0 Z"
                  className="fill-current"
                  transform={`rotate(${i * 30} 100 100)`}
                />
              ))}
            </svg>
            <span className="relative">
              <span className="block text-sm font-bold uppercase tracking-wider">
                {t.common.todaysChallenge}
              </span>
              <span className="mt-1 block font-display text-2xl font-semibold tracking-tight md:text-3xl">
                {daily.today.quiz.title}
              </span>
              {daily.streak > 0 && (
                <span className="mt-1 block text-sm font-bold">{t.home.streak(daily.streak)}</span>
              )}
            </span>
            <span className="relative rounded-full bg-surface px-5 py-2 font-display text-lg font-semibold text-content shadow-edge-surface transition-transform duration-200 group-hover:translate-x-1">
              {daily.playedToday ? t.home.doneToday : t.home.play}
            </span>
          </Link>
        )}

        {unfinished.length > 0 && (
          <section aria-labelledby="continue-title">
            <SectionHeading id="continue-title">{t.home.continueTitle}</SectionHeading>
            <ul className={fullRows.pairs.list}>
              {unfinished.map((item) => (
                <li key={item.attemptId} data-reveal className={fullRows.pairs.item}>
                  <Link
                    to={resumePath(item)}
                    className={cn(
                      cardLinkClass,
                      'group flex min-h-tap items-center justify-between gap-4 p-4',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg font-semibold text-content">
                        {item.quiz.title}
                      </span>
                      <span className="block text-sm font-bold text-content-muted">
                        {MODE_LABEL[item.mode]} · {t.play.questionOf(item.position, item.total)}
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-lg font-semibold text-primary transition-transform duration-200 group-hover:translate-x-1">
                      {t.home.resume}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(trending.loading || trending.error || trending.quizzes.length > 0) && (
          <section aria-labelledby="trending-title">
            <SectionHeading id="trending-title">{t.home.trendingTitle}</SectionHeading>
            {trending.loading && (
              <p role="status" className="text-content-muted">
                {t.home.trendingLoading}
              </p>
            )}
            {trending.error && (
              <div role="alert">
                <p className="text-content">{trending.error}</p>
                <button
                  type="button"
                  onClick={() => void trending.refresh()}
                  className={buttonClasses('ghost', 'md', 'mt-3')}
                >
                  {t.common.tryAgain}
                </button>
              </div>
            )}
            {!trending.loading && !trending.error && (
              <ul className={fullRows.quizzes.list}>
                {trending.quizzes.map((quiz) => (
                  <li key={quiz.id} data-reveal className={fullRows.quizzes.item}>
                    <QuizCard quiz={quiz} categorySlug={categorySlug.get(quiz.category_id ?? '')} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {categories.length > 0 && (
          <section aria-labelledby="subjects-title">
            <SectionHeading id="subjects-title">{t.home.subjectsTitle}</SectionHeading>
            <nav aria-label={t.home.categoriesLabel} className="space-y-6">
              {(['general', 'school'] as const)
                .map((kind) => ({ kind, items: categories.filter((c) => c.kind === kind) }))
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.kind}>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-content-muted">
                      {t.home.subjectGroups[group.kind]}
                    </h3>
                    <ul className={fullRows.tiles.list}>
                      {group.items.map((category) => {
                        const style = categoryStyle(category.slug);
                        return (
                          <li key={category.id} data-reveal className={fullRows.tiles.item}>
                            <Link
                              to={`/c/${category.slug}`}
                              className={cn(
                                cardLinkClass,
                                'group flex h-full min-h-tap items-center gap-3 p-3 font-display text-lg font-semibold leading-tight text-content',
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110',
                                  style.tile,
                                )}
                              >
                                {style.emoji}
                              </span>
                              <span className="min-w-0">{category.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
            </nav>
          </section>
        )}

        <section aria-labelledby="pick-title">
          <SectionHeading
            id="pick-title"
            action={
              visible.length > 0 && (
                <p className="text-sm font-bold text-content-muted">
                  {t.home.pickCount(visible.length, shown.length)}
                </p>
              )
            }
          >
            {t.home.pickTitle}
          </SectionHeading>

          <div role="group" aria-label={t.home.whoLabel}>
            <p className="mb-2 text-sm font-bold text-content-muted">{t.home.whoTitle}</p>
            <ul className="flex flex-wrap gap-2">
              <li>
                <button
                  type="button"
                  aria-pressed={age === null}
                  onClick={() => setAge(null)}
                  className={chipClass(age === null)}
                >
                  {t.home.whoAll}
                </button>
              </li>
              {AGE_BANDS.map((band) => (
                <li key={band.age}>
                  <button
                    type="button"
                    aria-pressed={age === band.age}
                    onClick={() => setAge(band.age)}
                    className={chipClass(age === band.age)}
                  >
                    {band.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {loading && (
            <p role="status" className="mt-8 text-content-muted">
              {t.home.quizzesLoading}
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
                {t.common.tryAgain}
              </button>
            </div>
          )}
          {!loading && !error && quizzes.length === 0 && (
            <p className="mt-8 text-content-muted">{t.home.empty}</p>
          )}
          {!loading && !error && quizzes.length > 0 && shown.length === 0 && (
            <p className="mt-8 text-content-muted">{t.home.noneForAge}</p>
          )}

          <ul id="all-quizzes" className={cn('mt-6', fullRows.quizzes.list)}>
            {visible.map((quiz) => (
              <li key={quiz.id} data-reveal className={fullRows.quizzes.item}>
                <QuizCard quiz={quiz} categorySlug={categorySlug.get(quiz.category_id ?? '')} />
              </li>
            ))}
          </ul>
          {shown.length > PREVIEW_COUNT && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                aria-expanded={showAll}
                aria-controls="all-quizzes"
                onClick={() => setShowAll((open) => !open)}
                className={buttonClasses('ghost', 'md')}
              >
                {showAll ? t.home.showFewer : t.home.showAll(shown.length)}
              </button>
            </div>
          )}
        </section>

        <section aria-labelledby="steps-title">
          <SectionHeading id="steps-title">{t.home.stepsTitle}</SectionHeading>
          <ol data-steps className="grid gap-4 md:grid-cols-3">
            {t.home.steps.map((step, i) => (
              <li
                key={step.title}
                data-reveal
                className="relative rounded-2xl border-2 border-surface-border bg-surface p-6"
              >
                <span
                  aria-hidden="true"
                  data-step-badge
                  className="absolute -top-4 right-5 grid h-9 w-9 place-items-center rounded-full bg-secondary font-display text-lg font-semibold text-secondary-fg shadow-edge-sun"
                >
                  {i + 1}
                </span>
                <span aria-hidden="true" data-step-emoji className="inline-block text-4xl">
                  {step.emoji}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-content">{step.title}</h3>
                <p className="mt-1 text-content-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
