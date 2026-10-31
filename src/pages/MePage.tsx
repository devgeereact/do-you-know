import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NicknamePicker } from '@/components/game/NicknamePicker';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMyGames } from '@/hooks/useMyGames';
import { useBestScores } from '@/hooks/useBestScores';
import { useProfile } from '@/hooks/useProfile';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Page } from '@/components/ui/Page';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Character } from '@/components/art/Art';
import { CountUp } from '@/components/ui/CountUp';
import { useReveal } from '@/hooks/useReveal';
import { t } from '@/i18n';

const AGE_BAND_LABEL = t.common.ageBands;

/** Nickname, age group and account deletion. Shown once a session exists. */
function ProfileCard(): JSX.Element | null {
  const { profile, error, deleteAccount, refresh } = useProfile();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!profile) return null;

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center gap-4">
        <AvatarBadge
          avatarId={profile.avatar_id}
          nickname={profile.nickname}
          size="md"
          label={t.me.profile.avatarLabel}
        />
        <div>
          <h2 className="text-xl font-semibold text-content">{t.me.profile.title}</h2>
          <Link
            to="/me/avatar"
            className="inline-flex min-h-tap items-center text-sm font-semibold text-primary underline underline-offset-2"
          >
            {profile.avatar_id ? t.me.profile.changeAvatar : t.me.profile.pickAvatar}
          </Link>
        </div>
      </div>
      {profile.nickname ? (
        <dl className="mt-3 grid gap-1 text-content">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-content-muted">{t.me.profile.nickname}</dt>
            <dd className="font-semibold">{profile.nickname}</dd>
          </div>
          {profile.age_band && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-content-muted">{t.me.profile.ageGroup}</dt>
              <dd className="font-semibold">{AGE_BAND_LABEL[profile.age_band]}</dd>
            </div>
          )}
        </dl>
      ) : (
        <div className="mt-4">
          <NicknamePicker onDone={() => void refresh()} />
        </div>
      )}

      <div className="mt-6 border-t-2 border-surface-border pt-4">
        {confirming ? (
          <div role="alertdialog" aria-labelledby="delete-title">
            <p id="delete-title" className="font-semibold text-content">
              {t.me.profile.confirmDelete}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                disabled={deleting}
                onClick={() => setConfirming(false)}
                autoFocus
              >
                {t.me.profile.keep}
              </Button>
              <Button
                className="bg-wrong text-wrong-fg shadow-none hover:bg-wrong/90"
                disabled={deleting}
                onClick={() => {
                  setDeleting(true);
                  void deleteAccount().then((ok) => {
                    setDeleting(false);
                    if (ok) navigate('/', { replace: true });
                  });
                }}
              >
                {t.me.profile.confirm}
              </Button>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-content">
                {error}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-tap rounded-full text-sm font-semibold text-content-muted underline underline-offset-2 hover:text-wrong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
          >
            {t.me.profile.delete}
          </button>
        )}
      </div>
    </Card>
  );
}

/** Best server-graded score per quiz, each linking back to the quiz page. */
function BestScores(): JSX.Element | null {
  const { scores, loading, error } = useBestScores();
  if (!loading && !error && scores.length === 0) return null;

  return (
    <section aria-labelledby="best-title">
      <SectionHeading id="best-title">{t.me.bestScores}</SectionHeading>
      {loading && (
        <p role="status" className="text-content-muted">
          {t.common.loading}
        </p>
      )}
      {error && (
        <p role="alert" className="text-content">
          {error}
        </p>
      )}
      <ul className="grid gap-3">
        {scores.map((score) => (
          <li key={score.quiz.slug} data-reveal>
            <Card className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link
                  to={`/q/${score.quiz.slug}`}
                  className="block truncate font-display text-lg font-semibold text-content hover:text-primary"
                >
                  {score.quiz.title}
                </Link>
                <p className="text-sm text-content-muted">
                  {t.me.time(score.answerTimeMs)} · {when(score.finishedAt)}
                </p>
              </div>
              <p className="shrink-0 font-display text-2xl font-semibold tabular-nums text-content">
                {score.correct}
                <span className="text-content-muted">/{score.total}</span>
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function when(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(t.locale, { day: 'numeric', month: 'short' });
}

export function MePage(): JSX.Element {
  const { games, streak, loading, error } = useMyGames();
  useDocumentMeta({ title: t.me.title, noindex: true });
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, [games.length]);
  // "My rounds" in the profile menu links to /me#games: scroll there once the list is in.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#games' || loading) return;
    document.getElementById('recent-title')?.scrollIntoView({ block: 'start' });
  }, [hash, loading]);

  return (
    <div ref={root}>
      <Page width="wide">
        <PageHeader title={t.me.title} className="mb-6" />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="flex items-center gap-3 p-4">
                <Character name="battery" size={48} />
                <div>
                  <p className="font-display text-3xl font-extrabold leading-none text-content">
                    <CountUp value={streak.current} />
                  </p>
                  <p className="mt-1 text-sm font-semibold text-content-muted">{t.me.dayStreak}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-3 p-4">
                <Character name="star" size={48} />
                <div>
                  <p className="font-display text-3xl font-extrabold leading-none text-content">
                    <CountUp value={games.length} />
                  </p>
                  <p className="mt-1 text-sm font-semibold text-content-muted">
                    {t.me.gamesPlayed}
                  </p>
                </div>
              </Card>
            </div>
            <ProfileCard />
            <Card className="p-5">
              <p className="text-content">{t.me.guestNote}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/me/settings" className={buttonClasses('ghost')}>
                  {t.me.settings}
                </Link>
                <Link to="/account" className={buttonClasses('ghost')}>
                  {t.me.accountLink}
                </Link>
              </div>
            </Card>
          </div>
          <div className="min-w-0">
            <BestScores />

            <SectionHeading id="recent-title" className="mt-10 scroll-mt-24">
              {t.me.recentGames}
            </SectionHeading>
            {loading && (
              <p role="status" className="text-content-muted">
                {t.common.loading}
              </p>
            )}
            {error && (
              <p role="alert" className="text-content">
                {error}
              </p>
            )}
            {!loading && !error && games.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-surface-border p-8 text-center">
                <p className="text-content-muted">{t.me.empty}</p>
                <Link to="/" className={buttonClasses('primary', 'md', 'mt-4')}>
                  {t.common.findAQuiz}
                </Link>
              </div>
            )}
            <ul id="games" aria-labelledby="recent-title" className="grid scroll-mt-24 gap-3">
              {games.map((game) => (
                <li key={game.attemptId} data-reveal>
                  <Card className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      {game.quiz ? (
                        <Link
                          to={`/q/${game.quiz.slug}`}
                          className="block truncate font-display text-lg font-semibold text-content hover:text-primary"
                        >
                          {game.quiz.title}
                        </Link>
                      ) : (
                        <p className="font-display text-lg font-semibold text-content-muted">
                          {t.me.retiredQuiz}
                        </p>
                      )}
                      <p className="text-sm text-content-muted">{when(game.finishedAt)}</p>
                    </div>
                    <p className="shrink-0 font-display text-2xl font-semibold tabular-nums text-content">
                      {game.correct}
                      <span className="text-content-muted">/{game.total}</span>
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Page>
    </div>
  );
}
