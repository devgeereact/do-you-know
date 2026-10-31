import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Character, Scene, WorldBackdrop, WorldGlyph } from '@/components/art/Art';
import { AvatarBadge } from '@/components/AvatarBadge';
import { QuizCard } from '@/components/game/QuizCard';
import { AnswerButton } from '@/components/game/AnswerButton';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { cardLinkClass, chipClass } from '@/components/ui/cardClasses';
import { useBestScores } from '@/hooks/useBestScores';
import { resumePath, useContinuePlaying } from '@/hooks/useContinuePlaying';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { DESKTOP, useMediaQuery } from '@/hooks/useMediaQuery';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { useReveal } from '@/hooks/useReveal';
import { useSession } from '@/hooks/useSession';
import { useTrendingQuizzes } from '@/hooks/useTrendingQuizzes';
import { WORLD_KEYS, type WorldKey } from '@/lib/art';
import { AGE_BANDS, suitsAge } from '@/lib/ageBands';
import { categoryStyle } from '@/lib/categoryStyle';
import { gsap, SplitText, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { frameStyle, world, worldFor } from '@/lib/worlds';
import {
  answerQuestion,
  getOverallBoard,
  nextQuestion,
  startAttempt,
} from '@/services/gameService';
import type { Category, Quiz } from '@/types';
import type { AnswerResult, AttemptState, OverallRow } from '@/types/game';
import { t } from '@/i18n';

/** "31 Oct" from a London YYYY-MM-DD date. */
function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(t.locale, {
    day: 'numeric',
    month: 'short',
  });
}

export function HomePage(): JSX.Element {
  useDocumentMeta({});
  const desktop = useMediaQuery(DESKTOP);
  const catalog = useQuizCatalog();
  const daily = useDailyChallenge();
  const trending = useTrendingQuizzes();
  const best = useBestScores();
  const bestBySlug = useMemo(
    () => new Map(best.scores.map((s) => [s.quiz.slug, Math.round((s.correct / s.total) * 100)])),
    [best.scores],
  );
  const slugOf = useMemo(
    () => new Map(catalog.categories.map((c) => [c.id, c.slug])),
    [catalog.categories],
  );
  const props = { catalog, daily, trending: trending.quizzes, bestBySlug, slugOf };
  return desktop ? <DesktopHome {...props} /> : <PhoneHome {...props} />;
}

interface HomeData {
  catalog: ReturnType<typeof useQuizCatalog>;
  daily: ReturnType<typeof useDailyChallenge>;
  trending: Quiz[];
  bestBySlug: Map<string, number>;
  slugOf: Map<string, string>;
}

/* ============================== Desktop ============================== */

function DesktopHome({ catalog, daily, trending, bestBySlug, slugOf }: HomeData): JSX.Element {
  const root = useRef<HTMLElement>(null);
  const { categories, quizzes } = catalog;
  const featured = trending[0] ?? quizzes[0] ?? null;
  useReveal(root, [quizzes.length, trending.length, categories.length]);

  // Hero entrance: words rise, then the lead, buttons and proof; the frame lands with a tilt.
  // The world behind drifts a little with the pointer. All transform-only and skipped under
  // reduced motion, so everything is readable at rest.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        const split = SplitText.create('[data-hero-title]', { type: 'words' });
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from(split.words, { yPercent: 40, opacity: 0, stagger: 0.04, duration: 0.45 })
          .add(() => split.revert())
          .from('[data-hero-fade]', { y: 16, opacity: 0, stagger: 0.08, duration: 0.4 }, '-=0.25')
          .from(
            '[data-hero-frame]',
            { y: 30, rotation: 1.5, duration: 0.6, ease: 'back.out(1.4)' },
            0.1,
          );
        const hero = root.current?.querySelector<HTMLElement>('[data-hero]');
        if (!hero || !window.matchMedia('(pointer: fine)').matches) return;
        const bx = gsap.quickTo('[data-hero-bg]', 'x', { duration: 0.8 });
        const by = gsap.quickTo('[data-hero-bg]', 'y', { duration: 0.8 });
        const fx = gsap.quickTo('[data-hero-frame]', 'x', { duration: 0.6 });
        const fy = gsap.quickTo('[data-hero-frame]', 'y', { duration: 0.6 });
        const move = (e: PointerEvent): void => {
          const r = hero.getBoundingClientRect();
          const dx = (e.clientX - r.left) / r.width - 0.5;
          const dy = (e.clientY - r.top) / r.height - 0.5;
          bx(dx * -24);
          by(dy * -14);
          fx(dx * 14);
          fy(dy * 10);
        };
        const leave = (): void => {
          bx(0);
          by(0);
          fx(0);
          fy(0);
        };
        hero.addEventListener('pointermove', move);
        hero.addEventListener('pointerleave', leave);
        return () => {
          hero.removeEventListener('pointermove', move);
          hero.removeEventListener('pointerleave', leave);
        };
      });
    },
    { scope: root },
  );

  const [titleBefore, titleAfter] = t.home.hero.title.split(t.home.hero.titleAccent);

  return (
    <main ref={root} className="overflow-x-clip">
      <section data-hero className="relative isolate overflow-hidden rounded-b-[2.5rem] text-white">
        <div data-hero-bg className="absolute -inset-[4%] -z-10">
          <WorldBackdrop world="ocean" />
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-center gap-12 px-6 pb-24 pt-20">
          <div>
            <p
              data-hero-fade
              className="inline-flex h-7 items-center rounded-full bg-white/20 px-3 text-sm font-bold backdrop-blur"
            >
              {t.home.hero.kicker}
            </p>
            <h1
              data-hero-title
              className="mt-4 text-[4.25rem] leading-[0.98] [text-shadow:0_3px_0_rgb(8_40_90/0.25)]"
            >
              {titleBefore}
              <span className="text-secondary">{t.home.hero.titleAccent}</span>
              {titleAfter}
            </h1>
            <p data-hero-fade className="mb-6 mt-4 max-w-[46ch] text-lg font-medium text-white/90">
              {t.home.hero.lead}
            </p>
            <div data-hero-fade className="flex flex-wrap gap-3">
              <Link
                to={daily.playedToday ? '/daily' : '/daily/play'}
                className={buttonClasses('play', 'lg')}
              >
                {t.home.hero.play}
              </Link>
              <a
                href="#worlds"
                className="inline-flex h-14 items-center rounded-full border-[1.5px] border-white/50 bg-white/15 px-7 text-lg font-bold backdrop-blur hover:bg-white/25 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white"
              >
                {t.home.hero.seeWorlds}
              </a>
            </div>
            <dl data-hero-fade className="mt-8 flex flex-wrap gap-7">
              <ProofStat value={quizzes.length} label={t.home.hero.quizzes} />
              <ProofStat value={categories.length} label={t.home.hero.subjects} />
              <ProofStat value={0} label={t.home.hero.noAds} />
            </dl>
          </div>
          <div data-hero-frame className="justify-self-end">
            {featured && <TryOne quiz={featured} />}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <section className="mt-10 grid grid-cols-3 items-stretch gap-6">
          <ProgressCard />
          <DailyCard daily={daily} />
          <TopThisWeek />
        </section>

        <section id="worlds" className="mt-14 scroll-mt-24">
          <SectionHead title={t.home.worldsTitle} lead={t.home.worldsLead} />
          <WorldTiles categories={categories} quizzes={quizzes} />
        </section>

        <section className="mt-14">
          <SectionHead title={t.home.subjectsTitle} lead={t.home.subjectsLead} />
          <SubjectTiles categories={categories} quizzes={quizzes} />
        </section>

        <section className="mt-14">
          <SectionHead title={t.home.popularTitle} />
          <QuizRows
            quizzes={(trending.length ? trending : quizzes).slice(0, 8)}
            bestBySlug={bestBySlug}
            slugOf={slugOf}
          />
        </section>

        <AllQuizzes quizzes={quizzes} bestBySlug={bestBySlug} slugOf={slugOf} />

        <ParentsBand />
      </div>
    </main>
  );
}

function ProofStat({ value, label }: { value: number; label: string }): JSX.Element {
  return (
    <div className="grid">
      <dt className="order-2 text-sm font-medium text-white/80">{label}</dt>
      <dd className="font-display text-3xl font-extrabold leading-none">
        {value.toLocaleString(t.locale)}
      </dd>
    </div>
  );
}

function SectionHead({
  title,
  lead,
  action,
}: {
  title: string;
  lead?: string;
  action?: JSX.Element;
}): JSX.Element {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[2rem] leading-tight">{title}</h2>
        {lead && <p className="mt-1 max-w-[56ch] text-content-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * "Try one": a real practice round, started only when the visitor asks. The server sends the
 * question and grades the answer, so nothing here knows the answer in advance. "Keep going"
 * opens the same round in the full game, which picks up at the next question.
 */
function TryOne({ quiz }: { quiz: Quiz }): JSX.Element {
  const { ensureSession } = useSession();
  const navigate = useNavigate();
  const [state, setState] = useState<AttemptState | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const question = state?.question ?? null;
  const w = question ? worldFor(question) : world('ocean');

  async function start(): Promise<void> {
    setStatus('loading');
    try {
      await ensureSession();
      let s = await startAttempt({ mode: 'practice', quizSlug: quiz.slug });
      if (s.complete) {
        navigate(`/play/${quiz.slug}?mode=practice`);
        return;
      }
      if (s.awaiting_next) s = await nextQuestion(s.attempt_id);
      setState(s);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  async function answer(optionId: string): Promise<void> {
    if (!state) return;
    setChosen(optionId);
    try {
      setResult(await answerQuestion(state.attempt_id, { optionId }));
    } catch {
      setStatus('error');
    }
  }

  const answerState = (id: string): 'idle' | 'right' | 'wrong' | 'dimmed' =>
    !result
      ? 'idle'
      : result.correct_option_ids.includes(id)
        ? 'right'
        : id === chosen
          ? 'wrong'
          : 'dimmed';
  // Slider questions need the full game's controls.
  const playable = question && question.type !== 'slider';

  return (
    <div className="stage-frame relative w-[34rem] max-w-full" style={frameStyle(w)}>
      <span className="stage-tab !text-[1.7rem]">{t.home.tryOne.tab}</span>
      <div className="pointer-events-none absolute -bottom-7 -left-14 z-[7] drop-shadow-[0_8px_10px_rgb(8_40_90/0.25)]">
        <Character
          name={w.host}
          size={120}
          mood={result ? (result.is_correct ? 'happy' : 'sad') : 'happy'}
        />
      </div>
      <div
        className="stage-inner min-h-[27rem]"
        data-dark={w.dark && !result}
        data-result={result ? (result.is_correct ? 'right' : 'wrong') : undefined}
      >
        <Scene world={w.key} className="!h-[55%]" />
        <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-7 pt-12 text-center">
          {!state ? (
            <>
              <p className="text-sm font-bold uppercase tracking-wider opacity-70">
                {t.home.tryOne.kicker}
              </p>
              <h2 className="max-w-[18ch] font-display text-[1.8rem] uppercase leading-[1.08]">
                {quiz.title}
              </h2>
              <p className="max-w-[34ch] text-[0.95rem] font-medium opacity-80">
                {t.home.tryOne.lead}
              </p>
              <button
                type="button"
                disabled={status === 'loading'}
                onClick={() => void start()}
                className="h-12 rounded-full bg-[var(--fd)] px-7 font-display text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_rgb(0_0_0/0.25)] active:translate-y-[3px] disabled:opacity-60"
              >
                {status === 'loading' ? t.home.tryOne.loading : t.home.tryOne.start}
              </button>
            </>
          ) : result ? (
            <>
              <h2 role="status" className="font-display text-[2.4rem] uppercase leading-none">
                {result.is_correct ? t.play.feedback.correct : t.play.feedback.wrong}
              </h2>
              {result.explanation && (
                <p className="max-w-[40ch] rounded-2xl bg-white/90 px-4 py-3 text-[0.95rem] font-medium text-[#17153A]">
                  {result.explanation}
                </p>
              )}
              <Link
                to={`/play/${quiz.slug}?mode=practice`}
                className="h-12 rounded-full bg-[var(--fd)] px-7 pt-[0.7rem] font-display text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_rgb(0_0_0/0.25)]"
              >
                {t.home.tryOne.keepGoing}
              </Link>
            </>
          ) : playable && question ? (
            <>
              <p className="text-sm font-semibold opacity-70">
                {state.position} / {state.total}
              </p>
              <h2 className="max-w-[22ch] font-display text-[1.55rem] uppercase leading-[1.1]">
                {question.prompt}
              </h2>
              <ul
                className={cn(
                  'grid w-full gap-2.5',
                  question.type === 'boolean' ? 'grid-cols-2' : 'grid-cols-2',
                )}
              >
                {question.options.map((o) => (
                  <li key={o.id}>
                    <AnswerButton
                      state={answerState(o.id)}
                      chosen={o.id === chosen}
                      onClick={() => void answer(o.id)}
                      className="!min-h-[3.1rem] !text-[0.95rem]"
                    >
                      {o.label}
                    </AnswerButton>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Link to={`/play/${quiz.slug}?mode=practice`} className={buttonClasses('play')}>
              {t.home.tryOne.keepGoing}
            </Link>
          )}
          {status === 'error' && (
            <p
              role="alert"
              className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-[#17153A]"
            >
              {t.home.tryOne.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressCard(): JSX.Element {
  const { user } = useSession();
  const daily = useDailyChallenge();
  const best = useBestScores();
  const name = user?.nickname || null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-6 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-widest text-content-muted">
        {t.home.progressKicker}
      </p>
      <div className="flex items-center gap-3">
        <AvatarBadge avatarId={user?.avatarId} nickname={name} size="md" />
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-extrabold">
            {name ? t.home.hello(name) : t.home.helloGuest}
          </p>
          <p className="text-sm text-content-muted">
            {daily.streak > 0 ? t.home.streakDays(daily.streak) : t.home.streakNone}
          </p>
        </div>
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2">
        <Stat value={daily.streak} label={t.home.statStreak} />
        <Stat
          value={user?.streak ? Math.max(user.streak, daily.streak) : daily.streak}
          label={t.home.statBest}
        />
        <Stat value={best.scores.length} label={t.home.statQuizzes} />
      </dl>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }): JSX.Element {
  return (
    <div className="grid rounded-xl bg-background px-3 py-2">
      <dt className="order-2 text-xs font-semibold text-content-muted">{label}</dt>
      <dd className="font-display text-2xl font-extrabold leading-tight">{value}</dd>
    </div>
  );
}

function DailyCard({
  daily,
  compact = false,
}: {
  daily: ReturnType<typeof useDailyChallenge>;
  compact?: boolean;
}): JSX.Element {
  const today = daily.today;
  const w = world(
    today?.stops[0] && (WORLD_KEYS as readonly string[]).includes(today.stops[0])
      ? (today.stops[0] as WorldKey)
      : 'ocean',
  );
  return (
    <Link
      to={daily.playedToday ? '/daily' : today ? '/daily/play' : '/daily'}
      className={cn(
        cardLinkClass,
        'relative isolate flex flex-col justify-end overflow-hidden border-0 text-white',
        compact ? 'min-h-[13rem] rounded-[1.75rem] p-5' : 'min-h-[14rem] p-6',
      )}
    >
      <WorldBackdrop world={w.key} className="-z-10" />
      <span className="absolute right-4 top-3 -z-[5]" aria-hidden="true">
        <Character name={w.host} size={compact ? 88 : 96} />
      </span>
      <span className="self-start rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-fg">
        {t.home.dailyKicker(today ? shortDate(today.date) : '')}
      </span>
      <h3 className="mt-2 text-[1.75rem] leading-tight [text-shadow:0_2px_0_rgb(0_0_0/0.2)]">
        {today ? today.quiz.title : t.home.dailyNone}
      </h3>
      <p className="mt-1 text-sm font-semibold text-white/90">
        {daily.playedToday ? t.home.dailyDone : t.home.dailyBody}
      </p>
      {!compact && (
        <span
          className={cn(
            buttonClasses(daily.playedToday ? 'ghost' : 'play', 'sm'),
            'mt-3 self-start',
          )}
        >
          {daily.playedToday ? t.home.dailyBoard : t.home.dailyStart}
        </span>
      )}
    </Link>
  );
}

function useTopThisWeek(): { rows: OverallRow[]; loaded: boolean } {
  const [rows, setRows] = useState<OverallRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    getOverallBoard('week', 3)
      .then((b) => live && setRows(b.rows))
      .catch(() => undefined)
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, []);
  return { rows, loaded };
}

function TopThisWeek(): JSX.Element {
  const { rows, loaded } = useTopThisWeek();
  const order = [rows[1], rows[0], rows[2]];
  const colours = ['bg-sky', 'bg-tang', 'bg-gum'];
  const heights = ['h-9', 'h-14', 'h-6'];
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-surface-border bg-surface p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-content-muted">
          {t.home.topKicker}
        </p>
        <Link
          to="/leaderboards?period=week"
          className="text-sm font-bold text-primary hover:underline"
        >
          {t.nav.leaderboards.label}
        </Link>
      </div>
      <p className="text-sm text-content-muted">{t.home.topSub}</p>
      {loaded && rows.length === 0 ? (
        <p className="mt-auto rounded-xl bg-background p-4 text-sm font-semibold text-content-muted">
          {t.home.topEmpty}
        </p>
      ) : (
        <ol className="mt-auto grid grid-cols-3 items-end gap-2 text-center">
          {order.map((row, i) => (
            <li key={row?.nickname ?? i} className="min-w-0">
              {row && (
                <>
                  <span className="mx-auto mb-1 block w-fit">
                    <AvatarBadge
                      avatarId={row.avatar_id}
                      nickname={row.nickname}
                      size={i === 1 ? 'md' : 'sm'}
                    />
                  </span>
                  <span className="block truncate text-sm font-bold">{row.nickname}</span>
                  <span className="block text-xs text-content-muted">
                    {t.leaderboards.points(row.points)}
                  </span>
                  <span
                    className={cn(
                      'mt-1 grid place-items-center rounded-t-lg font-display text-lg font-extrabold text-white',
                      colours[i],
                      heights[i],
                    )}
                  >
                    {row.rank}
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The eight worlds; each opens the first subject that lives in it. */
function WorldTiles({
  categories,
  quizzes,
}: {
  categories: Category[];
  quizzes: Quiz[];
}): JSX.Element {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {WORLD_KEYS.map((key) => {
        const w = world(key);
        const cats = categories.filter((c) => categoryStyle(c.slug, c).world === key);
        const count = quizzes.filter((q) => cats.some((c) => c.id === q.category_id)).length;
        const to = cats[0] ? `/c/${cats[0].slug}` : '/daily';
        return (
          <li key={key}>
            <Link
              to={to}
              data-reveal
              className="group relative isolate block aspect-[4/3] overflow-hidden rounded-[1.4rem] text-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
            >
              <WorldBackdrop
                world={key}
                className="-z-10 transition-transform duration-500 group-hover:scale-105"
              />
              {count > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold backdrop-blur">
                  {t.home.subjectQuizzes(count)}
                </span>
              )}
              <span className="absolute bottom-1 right-2" aria-hidden="true">
                <Character name={w.host} size={70} />
              </span>
              <span className="absolute bottom-3 left-3.5 flex items-center gap-1.5 font-display text-xl font-extrabold [text-shadow:0_2px_0_rgb(0_0_0/0.25)]">
                <WorldGlyph world={key} size={18} />
                {w.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Subject tiles in full rows of six (three or two on smaller screens): gaps become suggestions. */
function SubjectTiles({
  categories,
  quizzes,
}: {
  categories: Category[];
  quizzes: Quiz[];
}): JSX.Element {
  const tiles = categories.map((c) => ({
    c,
    n: quizzes.filter((q) => q.category_id === c.id).length,
  }));
  const spare = (6 - (tiles.length % 6)) % 6;
  const tile =
    'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[1.4rem] p-3 text-center transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary';
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
      {tiles.map(({ c, n }) => (
        <li key={c.id}>
          <Link
            to={`/c/${c.slug}`}
            data-reveal
            className={cn(
              tile,
              'bg-[rgb(var(--surface-border)/0.55)] hover:bg-[rgb(var(--surface-border))]',
            )}
          >
            <Character name={categoryStyle(c.slug, c).character} size={72} />
            <span className="font-bold leading-tight">{c.name}</span>
            <span className="text-xs font-medium text-content-muted">
              {t.home.subjectQuizzes(n)}
            </span>
          </Link>
        </li>
      ))}
      {Array.from({ length: spare }, (_, i) => (
        <li key={`s${i}`}>
          <Link
            to="/contact?type=idea"
            className={cn(
              tile,
              'border-2 border-dashed border-surface-border text-content-muted hover:border-primary hover:bg-primary/5',
            )}
          >
            <Character name="mug" size={60} />
            <span className="font-bold leading-tight text-content">{t.home.suggestSubject}</span>
            <span className="text-xs">{t.home.suggestSubjectLead}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Quiz rows in two even columns; an odd count ends with a "Suggest a quiz" row, never a gap. */
function QuizRows({
  quizzes,
  bestBySlug,
  slugOf,
}: {
  quizzes: Quiz[];
  bestBySlug: Map<string, number>;
  slugOf: Map<string, string>;
}): JSX.Element {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {quizzes.map((quiz) => (
        <li key={quiz.id} data-reveal>
          <QuizCard
            quiz={quiz}
            categorySlug={quiz.category_id ? slugOf.get(quiz.category_id) : undefined}
            best={bestBySlug.get(quiz.slug) ?? null}
          />
        </li>
      ))}
      {quizzes.length % 2 === 1 && (
        <li className="hidden lg:block">
          <SuggestRow />
        </li>
      )}
    </ul>
  );
}

function SuggestRow(): JSX.Element {
  return (
    <Link
      to="/contact?type=idea"
      className={cn(
        cardLinkClass,
        'flex h-full min-h-[5rem] items-center gap-4 border-dashed bg-transparent p-3 pr-4 shadow-none',
      )}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[rgb(var(--surface-border)/0.6)]">
        <Character name="mug" size={44} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{t.home.suggestQuiz}</span>
        <span className="text-sm text-content-muted">{t.home.suggestQuizLead}</span>
      </span>
      <span aria-hidden="true" className="font-display text-xl font-extrabold text-primary">
        →
      </span>
    </Link>
  );
}

const PREVIEW = 8;

function AllQuizzes({
  quizzes,
  bestBySlug,
  slugOf,
}: {
  quizzes: Quiz[];
  bestBySlug: Map<string, number>;
  slugOf: Map<string, string>;
}): JSX.Element {
  const [age, setAge] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const shown = age === null ? quizzes : quizzes.filter((q) => suitsAge(q, age));
  const visible = all ? shown : shown.slice(0, PREVIEW);
  return (
    <section className="mt-14">
      <SectionHead title={t.home.allTitle} lead={t.home.pickCount(visible.length, shown.length)} />
      <div role="group" aria-label={t.home.whoLabel} className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={age === null}
          onClick={() => setAge(null)}
          className={chipClass(age === null)}
        >
          {t.home.whoAll}
        </button>
        {AGE_BANDS.map((band) => (
          <button
            key={band.label}
            type="button"
            aria-pressed={age === band.age}
            onClick={() => setAge(band.age)}
            className={chipClass(age === band.age)}
          >
            {band.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-center font-semibold text-content-muted">
          {t.home.noneForAge}
        </p>
      ) : (
        <QuizRows quizzes={visible} bestBySlug={bestBySlug} slugOf={slugOf} />
      )}
      {shown.length > PREVIEW && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className={buttonClasses('ghost')}
          >
            {all ? t.home.showFewer : t.home.showAll(shown.length)}
          </button>
        </div>
      )}
    </section>
  );
}

function ParentsBand(): JSX.Element {
  return (
    <section className="my-14 grid items-center gap-8 overflow-hidden rounded-[2rem] bg-[#17153A] p-8 text-white lg:grid-cols-[1.1fr_1fr] lg:p-12">
      <div>
        <span className="rounded-full bg-sky/20 px-3 py-1 text-xs font-bold text-[#7EE6D9]">
          {t.home.parentsKicker}
        </span>
        <h2 className="mt-3 text-[2.1rem] leading-tight">{t.home.parentsTitle}</h2>
        <p className="mt-2 max-w-[52ch] text-white/75">{t.home.parentsLead}</p>
      </div>
      <ul className="grid gap-2.5 font-semibold">
        {t.home.parentsPoints.map((point) => (
          <li key={point} className="flex gap-3">
            <span
              aria-hidden="true"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky text-xs text-white"
            >
              ✓
            </span>
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ============================== Phone ============================== */

function PhoneHome({ catalog, daily, trending, bestBySlug, slugOf }: HomeData): JSX.Element {
  const { user } = useSession();
  const { items: unfinished } = useContinuePlaying();
  const { categories, quizzes } = catalog;
  const [subject, setSubject] = useState<string | null>(null);
  const name = user?.nickname || null;
  const list = subject
    ? quizzes.filter((q) => q.category_id === subject)
    : trending.length
      ? trending
      : quizzes;

  return (
    <main className="mx-auto grid max-w-xl gap-6 px-4 pb-6 pt-5 [&>*]:min-w-0">
      <section>
        <p className="text-sm text-content-muted">
          {name ? t.home.hello(name) : t.home.helloGuest}
        </p>
        <h1 className="text-[2rem] leading-tight">{t.home.mobileTitle}</h1>
      </section>

      <DailyCard daily={daily} compact />

      <Link
        to="/daily"
        className="flex items-center justify-between gap-3 rounded-[1.5rem] border-2 border-content bg-secondary px-5 py-4 text-left text-secondary-fg shadow-edge-ink"
      >
        <span>
          <span className="block text-sm font-semibold">
            {daily.streak > 0 ? t.home.streakCardTop : t.home.streakCardStart}
          </span>
          {daily.streak > 0 && (
            <span className="block font-display text-[1.7rem] font-extrabold leading-tight">
              {t.home.streakDays(daily.streak)}
            </span>
          )}
        </span>
        <Character name="battery" size={60} />
      </Link>

      {(unfinished.length > 0 || trending.length > 0) && (
        <section>
          <h2 className="mb-2.5 text-[1.4rem]">{t.home.carryOn}</h2>
          <ul className="-mx-4 grid snap-x snap-mandatory auto-cols-[82%] grid-flow-col gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {(unfinished.length
              ? unfinished.map((u) => ({
                  key: u.attemptId,
                  title: u.quiz.title,
                  to: resumePath(u),
                  slug: u.quiz.slug,
                }))
              : trending
                  .slice(0, 4)
                  .map((q) => ({ key: q.id, title: q.title, to: `/q/${q.slug}`, slug: q.slug }))
            ).map((item, i) => {
              const quiz = quizzes.find((q) => q.slug === item.slug);
              const style = categoryStyle(
                quiz?.category_id ? slugOf.get(quiz.category_id) : undefined,
              );
              const bg = [
                'bg-primary text-primary-fg',
                'bg-sky text-white',
                'bg-tang text-tang-fg',
              ][i % 3];
              return (
                <li key={item.key} className="snap-start">
                  <Link
                    to={item.to}
                    className={cn(
                      'grid min-h-[9.5rem] grid-cols-[1fr_auto] items-end gap-2 rounded-[1.5rem] p-4',
                      bg,
                    )}
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-2 font-display text-[1.35rem] font-extrabold leading-tight">
                        {item.title}
                      </span>
                      <span className="mt-3 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-fg">
                        {t.home.letsGo}
                      </span>
                    </span>
                    <Character name={style.character} size={72} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2.5 text-[1.4rem]">{t.home.subjectsTitle}</h2>
        <div
          role="group"
          aria-label={t.home.categoriesLabel}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          <button
            type="button"
            aria-pressed={subject === null}
            onClick={() => setSubject(null)}
            className={cn(chipClass(subject === null), 'shrink-0')}
          >
            {t.home.whoAll}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={subject === c.id}
              onClick={() => setSubject(c.id)}
              className={cn(chipClass(subject === c.id), 'shrink-0 gap-1.5 pl-1.5')}
            >
              <Character name={categoryStyle(c.slug, c).character} size={26} />
              {c.name}
            </button>
          ))}
        </div>
        {subject && (
          <Link
            to={`/c/${categories.find((c) => c.id === subject)?.slug ?? ''}`}
            className="mt-3 inline-flex min-h-tap items-center gap-1 font-bold text-primary"
          >
            {t.home.seeSubject(categories.find((c) => c.id === subject)?.name ?? '')}
            <span aria-hidden="true">→</span>
          </Link>
        )}
        <ul className="mt-3 grid gap-2.5">
          {list.map((quiz) => (
            <li key={quiz.id}>
              <QuizCard
                quiz={quiz}
                categorySlug={quiz.category_id ? slugOf.get(quiz.category_id) : undefined}
                best={bestBySlug.get(quiz.slug) ?? null}
              />
            </li>
          ))}
          {list.length === 0 && (
            <li className="rounded-2xl bg-surface p-5 text-center font-semibold text-content-muted">
              {t.home.empty}
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
