import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Character, WorldBackdrop, WorldGlyph } from '@/components/art/Art';
import { LeaderboardTable } from '@/components/game/LeaderboardTable';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { WORLD_KEYS, isWorld, type WorldKey } from '@/lib/art';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { world } from '@/lib/worlds';
import { londonToday } from '@/services/gameService';
import { t } from '@/i18n';

function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(t.locale, {
    day: 'numeric',
    month: 'short',
  });
}

/** Time left until midnight in London, as HH:MM:SS. */
function untilLondonMidnight(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const left = 24 * 3600 - (get('hour') * 3600 + get('minute') * 60 + get('second'));
  return [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

function useCountdown(): string {
  const [left, setLeft] = useState(untilLondonMidnight);
  useEffect(() => {
    const id = window.setInterval(() => setLeft(untilLondonMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return left;
}

/**
 * Today's challenge. One screen, no page scroll: an animated route through today's worlds
 * (the scene changes at each stop, the owl moves along the track and a deck of postcards
 * shows the next stops), today's numbers, the player's week and today's board. It never
 * shows the questions themselves, so nothing can be looked up in advance.
 */
export function DailyPage(): JSX.Element {
  const { today, playedToday, streak, loading, error } = useDailyChallenge();
  const board = useLeaderboard(null, 'daily', 50);
  const reduce = useReducedMotion();
  const countdown = useCountdown();
  useDocumentMeta({ title: t.common.todaysChallenge, description: t.daily.metaDescription });

  const stops = useMemo<WorldKey[]>(() => {
    const list = (today?.stops ?? []).map((s, i): WorldKey =>
      isWorld(s) ? s : (WORLD_KEYS[i % WORLD_KEYS.length] ?? 'ocean'),
    );
    return list.length ? list : ['ocean'];
  }, [today?.stops]);
  const unique = useMemo(() => Array.from(new Set(stops)), [stops]);

  // One stop every two seconds, looping; still under reduced motion.
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce || stops.length < 2) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % stops.length), 2000);
    return () => window.clearInterval(id);
  }, [reduce, stops.length]);
  const current = stops[step] ?? 'ocean';

  const stage = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const track = stage.current?.querySelector<HTMLElement>('[data-track]');
      const dot = stage.current?.querySelector<HTMLElement>(`[data-stop="${step}"]`);
      if (!track || !dot) return;
      const x = dot.offsetLeft + dot.offsetWidth / 2 - 17;
      const fill = stops.length > 1 ? (step / (stops.length - 1)) * 100 : 0;
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        gsap.set('[data-token]', { x });
        gsap.set('[data-fill]', { width: `${fill}%` });
      });
      mm.add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.to('[data-token]', { x, duration: 0.55, ease: 'power2.inOut' });
        gsap.fromTo(
          '[data-token]',
          { y: 0 },
          { y: -10, duration: 0.2, yoyo: true, repeat: 1, delay: 0.2 },
        );
        gsap.to('[data-fill]', { width: `${fill}%`, duration: 0.55, ease: 'power2.inOut' });
        gsap.fromTo(
          '[data-card]',
          { x: 24, opacity: 0.6 },
          { x: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out' },
        );
      });
    },
    { scope: stage, dependencies: [step, stops.length] },
  );

  const rows = board.data?.top ?? [];
  const average = today?.stats?.average ?? null;
  const days = Array.from({ length: 7 }, (_, i) =>
    londonToday(new Date(Date.now() - (6 - i) * 86400000)),
  );

  return (
    <main className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-3 lg:px-6 lg:py-5">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(17rem,1.25fr)_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)] lg:grid-rows-1 lg:gap-5">
        <section
          ref={stage}
          aria-label={t.common.todaysChallenge}
          className="relative isolate flex min-h-0 flex-col justify-between overflow-hidden rounded-[1.75rem] p-4 text-white shadow-lift lg:p-6"
        >
          {unique.map((key) => (
            <div
              key={key}
              className={cn(
                'absolute inset-0 -z-20 transition-opacity duration-700',
                key === current ? 'opacity-100' : 'opacity-0',
              )}
            >
              <WorldBackdrop world={key} />
            </div>
          ))}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgb(10_10_40/0.15)] via-transparent to-[rgb(10_10_40/0.45)]"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-bold text-secondary-fg">
              {t.daily.kicker(today ? shortDate(today.date) : shortDate(londonToday()))}
            </span>
            <span
              className="rounded-full bg-black/25 px-3 py-1 font-display text-sm font-extrabold tabular-nums backdrop-blur lg:text-base"
              aria-live="off"
            >
              {t.daily.countdown(countdown)}
            </span>
          </div>

          <div className="grid gap-2.5 lg:max-w-[46%]">
            <h1 className="text-[2rem] leading-none [text-shadow:0_3px_0_rgb(0_0_0/0.25)] lg:text-[3rem]">
              {loading ? t.common.loading : today ? today.quiz.title : t.daily.notReady}
            </h1>
            {error && <p role="alert">{error}</p>}
            {today && (
              <p className="max-w-[44ch] text-sm font-medium text-white/90 lg:text-base">
                {t.daily.route(stops.length, unique.length)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {today && !playedToday && (
                <Link to="/daily/play" className={buttonClasses('play', 'lg')}>
                  {t.daily.play}
                </Link>
              )}
              {playedToday && (
                <span className="inline-flex h-9 items-center rounded-full bg-correct px-4 text-sm font-bold text-correct-fg">
                  {t.daily.done}
                </span>
              )}
              {!today && !loading && (
                <Link to="/" className={buttonClasses('ghost')}>
                  {t.daily.tryAQuiz}
                </Link>
              )}
              <span
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/20 px-3 text-sm font-bold backdrop-blur"
                aria-live="off"
              >
                <WorldGlyph world={current} />
                {t.daily.stopNow(world(current).name, step + 1)}
              </span>
            </div>
          </div>

          {/* Postcards for the current and next stops, with the stop's character on the front one. */}
          <div
            aria-hidden="true"
            className="absolute right-[6%] top-[18%] hidden h-[10.5rem] w-[14rem] lg:block"
          >
            {[0, 1, 2].map((k) => {
              const i = Math.min(step + k, stops.length - 1);
              const key = stops[i] ?? 'ocean';
              const gone = step + k > stops.length - 1 && k > 0;
              return (
                <div
                  key={k}
                  data-card
                  className={cn(
                    'absolute inset-0 isolate overflow-hidden rounded-[1.25rem] border-[5px] border-white shadow-[0_14px_30px_-12px_rgb(0_0_0/0.45)]',
                    gone && 'invisible',
                  )}
                  style={{
                    zIndex: 3 - k,
                    transform: [
                      'rotate(-4deg)',
                      'translate(34px,-14px) rotate(5deg) scale(.92)',
                      'translate(64px,-26px) rotate(11deg) scale(.84)',
                    ][k],
                  }}
                >
                  <WorldBackdrop world={key} className="-z-10" />
                  <span className="absolute bottom-2 left-2.5 grid font-display text-lg font-extrabold leading-tight [text-shadow:0_2px_0_rgb(0_0_0/0.3)]">
                    <span className="font-sans text-[0.65rem] font-bold uppercase tracking-widest opacity-90">
                      {t.daily.stop(i + 1)}
                    </span>
                    {world(key).name}
                  </span>
                </div>
              );
            })}
            <div className="absolute -bottom-12 -left-16 z-10">
              <Character name={world(current).host} size={120} />
            </div>
          </div>
          <div aria-hidden="true" className="absolute right-3 top-12 lg:hidden">
            <Character name={world(current).host} size={84} />
          </div>

          <div
            data-track
            aria-label={t.daily.routeLabel}
            className="relative mt-3 flex items-center justify-between px-1 pt-7"
          >
            <div className="absolute left-3.5 right-3.5 top-[calc(50%+14px)] h-1.5 -translate-y-1/2 rounded-full bg-white/30">
              <i data-fill className="block h-full w-0 rounded-full bg-secondary" />
            </div>
            {stops.map((key, i) => (
              <span
                key={i}
                data-stop={i}
                title={t.daily.stopLabel(i + 1, world(key).name)}
                className={cn(
                  'relative z-[1] grid h-6 w-6 place-items-center rounded-full transition-colors lg:h-7 lg:w-7',
                  i <= step ? 'bg-white text-[#17153A]' : 'bg-white/35 text-white',
                )}
              >
                <WorldGlyph world={key} size={13} />
              </span>
            ))}
            <span
              data-token
              aria-hidden="true"
              className="absolute left-0 top-0 z-[2] drop-shadow-[0_4px_4px_rgb(0_0_0/0.3)]"
            >
              <Character name="owl" size={34} />
            </span>
          </div>
        </section>

        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-rows-[auto_auto_minmax(0,1fr)]">
          <dl className="grid grid-cols-3 gap-2">
            {[
              [today?.stats?.played ?? rows.length, t.daily.stats.played],
              [average === null ? '–' : average.toFixed(1), t.daily.stats.average],
              [
                today?.stats?.perfect ?? rows.filter((r) => r.correct === r.total).length,
                t.daily.stats.perfect,
              ],
            ].map(([value, label]) => (
              <div
                key={String(label)}
                className="grid rounded-2xl border border-surface-border bg-surface px-3 py-2.5 shadow-soft"
              >
                <dt className="order-2 text-xs font-semibold text-content-muted">{label}</dt>
                <dd className="font-display text-2xl font-extrabold leading-tight tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="hidden rounded-2xl border border-surface-border bg-surface p-4 shadow-soft lg:block">
            <div className="flex items-center justify-between">
              <p className="font-bold">{t.daily.streakTitle(streak)}</p>
            </div>
            <ol className="mt-2 grid grid-cols-7 gap-1.5 text-center">
              {days.map((d, i) => {
                // A streak is consecutive days ending today (if played) or yesterday.
                const end = playedToday ? 6 : 5;
                const on = i <= end && i > end - streak;
                return (
                  <li
                    key={d}
                    className="grid justify-items-center gap-1 text-xs font-bold text-content-muted"
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 place-items-center rounded-full',
                        on ? 'bg-tang text-white' : 'bg-background',
                        d === londonToday() && 'outline outline-2 outline-offset-2 outline-content',
                      )}
                    >
                      {on && '✓'}
                    </span>
                    {new Date(`${d}T12:00:00Z`).toLocaleDateString(t.locale, { weekday: 'narrow' })}
                  </li>
                );
              })}
            </ol>
          </div>
          <section className="flex min-h-0 flex-col rounded-2xl border border-surface-border bg-surface p-3 shadow-soft">
            <div className="flex items-center justify-between px-1 pb-2">
              <h2 className="text-xl">{t.daily.boardTitle}</h2>
              <Link to="/leaderboards" className="text-sm font-bold text-primary hover:underline">
                {t.daily.allSubjects}
              </Link>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {board.data ? (
                <LeaderboardTable data={board.data} board="daily" />
              ) : board.error ? (
                <p className="p-3 text-content-muted">{t.daily.boardError}</p>
              ) : (
                <p role="status" className="p-3 text-content-muted">
                  {t.common.loading}
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
