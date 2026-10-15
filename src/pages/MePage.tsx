import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NicknamePicker } from '@/components/game/NicknamePicker';
import { SiteHeader } from '@/components/SiteHeader';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMyGames } from '@/hooks/useMyGames';
import { useProfile } from '@/hooks/useProfile';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const AGE_BAND_LABEL = {
  under_13: 'Under 13',
  '13_17': '13 to 17',
  '18_plus': '18 or over',
} as const;

/** Nickname, age group and account deletion. Shown once a session exists. */
function ProfileCard(): JSX.Element | null {
  const { profile, error, deleteAccount } = useProfile();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!profile) return null;

  return (
    <Card className="mt-6 p-5">
      <h2 className="text-xl font-semibold text-content">Your profile</h2>
      {profile.nickname ? (
        <dl className="mt-3 grid gap-1 text-content">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-content-muted">Leaderboard name:</dt>
            <dd className="font-semibold">{profile.nickname}</dd>
          </div>
          {profile.age_band && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-content-muted">Age group:</dt>
              <dd className="font-semibold">{AGE_BAND_LABEL[profile.age_band]}</dd>
            </div>
          )}
        </dl>
      ) : (
        <div className="mt-4">
          <NicknamePicker />
        </div>
      )}

      <div className="mt-6 border-t-2 border-surface-border pt-4">
        {confirming ? (
          <div role="alertdialog" aria-labelledby="delete-title">
            <p id="delete-title" className="font-semibold text-content">
              Delete your account and every score? This can’t be undone.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                disabled={deleting}
                onClick={() => setConfirming(false)}
                autoFocus
              >
                Keep my account
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
                Yes, delete everything
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
            className="min-h-tap text-sm font-semibold text-content-muted underline underline-offset-2"
          >
            Delete my account
          </button>
        )}
      </div>
    </Card>
  );
}

function when(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MePage(): JSX.Element {
  const { user } = useSupabaseAuth();
  const { games, streak, loading, error } = useMyGames();
  const isGuest = user === null || user.is_anonymous === true;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4 md:px-8">
        <h1 className="text-4xl font-semibold text-content">My games</h1>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Card className="p-5 text-center">
            <p className="font-display text-4xl font-semibold text-content">{streak.current}</p>
            <p className="text-sm font-bold text-content-muted">Day streak</p>
          </Card>
          <Card className="p-5 text-center">
            <p className="font-display text-4xl font-semibold text-content">{games.length}</p>
            <p className="text-sm font-bold text-content-muted">Games played</p>
          </Card>
        </div>

        <ProfileCard />

        {isGuest ? (
          <Card className="mt-6 p-5">
            <p className="text-content">
              You’re playing as a guest, so your games live on this device only.
            </p>
            <Link to="/login" className={buttonClasses('primary', 'md', 'mt-4')}>
              Save my progress
            </Link>
          </Card>
        ) : (
          <Link to="/dashboard" className={buttonClasses('ghost', 'md', 'mt-6')}>
            Settings
          </Link>
        )}

        <h2 className="mb-4 mt-10 text-2xl font-semibold text-content">Recent games</h2>
        {loading && (
          <p role="status" className="text-content-muted">
            Loading…
          </p>
        )}
        {error && (
          <p role="alert" className="text-content">
            {error}
          </p>
        )}
        {!loading && !error && games.length === 0 && (
          <div className="text-center">
            <p className="text-content-muted">No games yet. Pick a quiz and give it a go!</p>
            <Link to="/" className={buttonClasses('primary', 'md', 'mt-4')}>
              Find a quiz
            </Link>
          </div>
        )}
        <ul className="grid gap-3">
          {games.map((game) => (
            <li key={game.attemptId}>
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
                      A retired quiz
                    </p>
                  )}
                  <p className="text-sm text-content-muted">{when(game.finishedAt)}</p>
                </div>
                <p className="shrink-0 font-display text-2xl font-semibold text-content">
                  {game.correct}
                  <span className="text-content-muted">/{game.total}</span>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
