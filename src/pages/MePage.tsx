import { useCallback, useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Character } from '@/components/art/Art';
import { AvatarBadge } from '@/components/AvatarBadge';
import { NicknamePicker } from '@/components/game/NicknamePicker';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { Card } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { useBestScores } from '@/hooks/useBestScores';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useMyGames } from '@/hooks/useMyGames';
import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { AVATARS } from '@/lib/avatars';
import { gameErrorMessage } from '@/lib/gameErrors';
import { cn } from '@/lib/utils';
import {
  getMyMessages,
  getNicknameSuggestions,
  markMessagesSeen,
  replyToMessage,
  setNickname,
} from '@/services/profileService';
import type { MyMessage, Profile } from '@/types';
import { t } from '@/i18n';

function when(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(t.locale, { day: 'numeric', month: 'short' });
}

function sinceDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(t.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const sectionTitle = 'font-display text-2xl font-extrabold text-content';

/**
 * The player's one page: who they are (character and nickname), their messages with us, and their
 * rounds. Everything the old avatar menu pointed at now lives here.
 */
export function MePage(): JSX.Element {
  useDocumentMeta({ title: t.me.title, noindex: true });
  const profile = useProfile();
  const { games, streak, loading: gamesLoading, error: gamesError } = useMyGames();
  const { hash } = useLocation();

  // Old links (/me#games, /me#messages, /me#character) land on their section once it is drawn.
  useEffect(() => {
    if (!hash || profile.loading) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash, profile.loading]);

  const p = profile.profile;
  const { user, ensureSession } = useSession();
  // Someone opening their profile first still gets a guest session (no email, nothing personal).
  useEffect(() => {
    ensureSession().catch(() => undefined);
  }, [ensureSession]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 lg:px-8 lg:pt-10">
      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-10">
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <Identity profile={p} />
          <div className="grid grid-cols-3 gap-2">
            <Stat value={streak.current} label={t.me.dayStreak} art="battery" />
            <Stat value={p?.streak_best ?? 0} label={t.me.bestStreak} art="rocket" />
            <Stat value={games.length} label={t.me.gamesPlayed} art="star" />
          </div>
          {p && <NicknameOnce profile={p} onChanged={profile.refresh} />}
          <div className="flex flex-wrap gap-2">
            <Link to="/me/settings" className={buttonClasses('ghost', 'sm')}>
              {t.me.settings}
            </Link>
            <Link to="/contact" className={buttonClasses('ghost', 'sm')}>
              {t.me.messages.write}
            </Link>
          </div>
          <DeleteData />
        </aside>

        <div className="grid min-w-0 gap-10">
          <CharacterPicker profile={p} onPick={profile.setAvatar} />
          {user && <Messages key={user.id} />}
          <section id="games" aria-labelledby="games-title" className="scroll-mt-24">
            <div className="grid gap-8 xl:grid-cols-2">
              <div>
                <h2 id="games-title" className={sectionTitle}>
                  {t.me.recentGames}
                </h2>
                <RecentRounds games={games} loading={gamesLoading} error={gamesError} />
              </div>
              <BestScores />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Identity({ profile }: { profile: Profile | null }): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-soft">
      <div aria-hidden="true" className="h-20 bg-gradient-to-br from-primary to-[#9C86FF]" />
      <div className="-mt-12 grid justify-items-center px-5 pb-5 text-center">
        <span className="rounded-full ring-4 ring-surface">
          <AvatarBadge
            avatarId={profile?.avatar_id}
            nickname={profile?.nickname}
            size="lg"
            label={t.me.profile.avatarLabel}
          />
        </span>
        <h1 className="mt-3 break-all font-display text-[1.9rem] font-extrabold leading-tight">
          {profile?.nickname ?? t.nav.menu.player}
        </h1>
        <p className="mt-1 text-sm text-content-muted">
          {[
            profile?.age_band ? t.common.ageBands[profile.age_band] : null,
            profile?.created_at ? t.me.since(sinceDate(profile.created_at)) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  art,
}: {
  value: number;
  label: string;
  art: 'battery' | 'rocket' | 'star';
}): JSX.Element {
  return (
    <Card className="grid justify-items-center gap-1 p-3 text-center">
      <Character name={art} size={34} />
      <p className="font-display text-2xl font-extrabold leading-none tabular-nums">
        <CountUp value={value} />
      </p>
      <p className="text-xs font-semibold text-content-muted">{label}</p>
    </Card>
  );
}

/** The one nickname change: pick a suggested name (anyone) or type one (13+), then confirm. */
function NicknameOnce({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: () => Promise<void>;
}): JSX.Element {
  const { reload } = useSession();
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [choice, setChoice] = useState('');
  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const typeId = useId();
  const mayType = profile.age_band === '13_17' || profile.age_band === '18_plus';
  const pick = typed.trim() || choice;

  const loadNames = useCallback(() => {
    setError(null);
    getNicknameSuggestions()
      .then((list) => {
        setNames(list);
        setChoice('');
      })
      .catch((err: unknown) => setError(gameErrorMessage(err as { message?: string })));
  }, []);

  if (!profile.nickname) {
    return (
      <Card className="p-5">
        <NicknamePicker onDone={() => void onChanged()} />
      </Card>
    );
  }

  if (profile.nickname_locked || done) {
    return (
      <Card className="flex items-start gap-3 p-4">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-primary"
        >
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <div>
          <p className="font-bold">{t.me.nicknameOnce.title}</p>
          {done && (
            <p role="status" className="text-sm font-semibold text-correct">
              {t.me.nicknameOnce.done(done)}
            </p>
          )}
          <p className="text-sm text-content-muted">{t.me.nicknameOnce.locked}</p>
        </div>
      </Card>
    );
  }

  const save = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const name = await setNickname(pick);
      setDone(name);
      setConfirming(false);
      setOpen(false);
      await onChanged();
      await reload();
    } catch (err) {
      setError(gameErrorMessage(err as { message?: string }));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="grid gap-3 p-5">
      <div>
        <p className="font-bold">{t.me.nicknameOnce.title}</p>
        <p className="text-sm text-content-muted">{t.me.nicknameOnce.open}</p>
      </div>
      {!open ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(true);
            loadNames();
          }}
        >
          {t.me.nicknameOnce.change}
        </Button>
      ) : confirming ? (
        <div
          role="alertdialog"
          aria-labelledby="nick-confirm"
          className="grid gap-3 rounded-2xl bg-background p-4"
        >
          <p id="nick-confirm" className="font-display text-lg font-extrabold">
            {t.me.nicknameOnce.confirmTitle(pick)}
          </p>
          <p className="text-sm text-content-muted">{t.me.nicknameOnce.confirmBody}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void save()} autoFocus>
              {t.me.nicknameOnce.confirm}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              {t.me.nicknameOnce.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm font-bold">{t.me.nicknameOnce.pick}</p>
          <div
            role="radiogroup"
            aria-label={t.me.nicknameOnce.pick}
            className="grid grid-cols-2 gap-2"
          >
            {names.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={choice === name && !typed.trim()}
                onClick={() => {
                  setChoice(name);
                  setTyped('');
                }}
                className={cn(
                  'min-h-[44px] truncate rounded-xl border-2 px-3 text-sm font-bold',
                  choice === name && !typed.trim()
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-surface-border bg-surface text-content hover:border-primary/40',
                )}
              >
                {name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={loadNames}
            className="justify-self-start text-sm font-semibold text-primary underline underline-offset-2"
          >
            {t.me.nicknameOnce.others}
          </button>
          {mayType && (
            <div className="grid gap-1">
              <label htmlFor={typeId} className="text-sm font-bold">
                {t.me.nicknameOnce.orType}
              </label>
              <input
                id={typeId}
                value={typed}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => setTyped(e.target.value)}
                className="h-11 rounded-xl border-2 border-surface-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
              />
              <span className="text-xs text-content-muted">{t.me.nicknameOnce.typeHint}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!pick || busy} onClick={() => setConfirming(true)}>
              {pick ? t.me.nicknameOnce.use(pick) : t.me.nicknameOnce.pick}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {t.me.nicknameOnce.cancel}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-wrong">
          {error}
        </p>
      )}
    </Card>
  );
}

function CharacterPicker({
  profile,
  onPick,
}: {
  profile: Profile | null;
  onPick: (id: string) => Promise<boolean>;
}): JSX.Element {
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <section id="character" aria-labelledby="character-title" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="character-title" className={sectionTitle}>
            {t.me.character.title}
          </h2>
          <p className="text-content-muted">{t.me.character.lead}</p>
        </div>
        <p role="status" className="text-sm font-semibold text-correct">
          {saved ? t.me.character.saved(saved) : ''}
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {AVATARS.map((avatar) => {
          const current = profile?.avatar_id === avatar.id;
          return (
            <li key={avatar.id}>
              <button
                type="button"
                aria-pressed={current}
                disabled={saving !== null}
                onClick={() => {
                  setSaving(avatar.id);
                  void onPick(avatar.id).then((ok) => {
                    setSaving(null);
                    if (ok) setSaved(avatar.label);
                  });
                }}
                className={cn(
                  'relative grid w-full justify-items-center gap-1 rounded-2xl border-2 px-2 pb-3 pt-4 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary',
                  current
                    ? 'border-primary bg-primary/10'
                    : 'border-surface-border bg-surface hover:border-primary/40',
                )}
              >
                {current && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg"
                  >
                    ✓
                  </span>
                )}
                <AvatarBadge avatarId={avatar.id} nickname={avatar.label} size="md" />
                <span className="text-sm font-bold">{avatar.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** What the player sent us and our replies. Opening the page clears the unread dot. */
function Messages(): JSX.Element {
  const { reload } = useSession();
  const [items, setItems] = useState<MyMessage[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    getMyMessages()
      .then((r) => {
        setItems(r.items);
        if (r.items.some((m) => m.unread)) {
          void markMessagesSeen().then(() => reload());
        }
      })
      .catch(() => setFailed(true));
  }, [reload]);

  useEffect(load, [load]);

  return (
    <section id="messages" aria-labelledby="messages-title" className="scroll-mt-24">
      <h2 id="messages-title" className={sectionTitle}>
        {t.me.messages.title}
      </h2>
      <p className="text-content-muted">{t.me.messages.lead}</p>
      <div className="mt-4 grid gap-3">
        {failed && <p role="alert">{t.errors.gameFallback}</p>}
        {items && items.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-surface-border p-6 text-center">
            <p className="text-content-muted">{t.me.messages.empty}</p>
            <Link to="/contact" className={buttonClasses('ghost', 'sm', 'mt-3')}>
              {t.me.messages.write}
            </Link>
          </div>
        )}
        {items?.map((m) => (
          <Thread key={m.id} message={m} onSent={load} />
        ))}
      </div>
    </section>
  );
}

function Thread({ message, onSent }: { message: MyMessage; onSent: () => void }): JSX.Element {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const id = useId();
  const sent = message.message ?? message.presets.join(' · ');
  return (
    <Card className={cn('grid gap-3 p-4', message.unread && 'ring-2 ring-tang')}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
          {t.feedback.types[message.type]}
        </span>
        {message.unread && (
          <span className="rounded-full bg-tang px-2 py-0.5 text-[#17153A]">
            {t.me.messages.newReply}
          </span>
        )}
        <span className="text-content-muted">{when(message.created_at)}</span>
        {message.quiz && (
          <span className="text-content-muted">· {t.me.messages.about(message.quiz.title)}</span>
        )}
      </div>
      <Bubble from="me" body={sent} />
      {message.thread.map((m) => (
        <Bubble key={m.id} from={m.from} body={m.body} at={m.created_at} />
      ))}
      {message.thread.every((m) => m.from !== 'staff') && (
        <p className="text-sm text-content-muted">{t.me.messages.waiting}</p>
      )}
      {message.status === 'resolved' && message.thread.length > 0 && (
        <p className="text-sm text-content-muted">{t.me.messages.closed}</p>
      )}
      {message.can_reply && message.thread.some((m) => m.from === 'staff') && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setNote(null);
            replyToMessage(message.id, text.trim())
              .then(() => {
                setText('');
                setNote(t.me.messages.sent);
                onSent();
              })
              .catch((err: unknown) => setNote(gameErrorMessage(err as { message?: string })))
              .finally(() => setBusy(false));
          }}
        >
          <label htmlFor={id} className="text-sm font-bold">
            {t.me.messages.replyLabel}
          </label>
          <textarea
            id={id}
            rows={2}
            maxLength={1000}
            value={text}
            placeholder={t.me.messages.replyPlaceholder}
            onChange={(e) => setText(e.target.value)}
            className="rounded-xl border-2 border-surface-border bg-surface px-3 py-2 text-base focus:border-primary focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <Button size="sm" type="submit" disabled={busy || text.trim().length < 2}>
              {busy ? t.me.messages.sending : t.me.messages.send}
            </Button>
            {note && (
              <span role="status" className="text-sm text-content-muted">
                {note}
              </span>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}

function Bubble({
  from,
  body,
  at,
}: {
  from: 'me' | 'staff';
  body: string;
  at?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'grid max-w-[85%] gap-1',
        from === 'me' ? 'justify-self-end' : 'justify-self-start',
      )}
    >
      <p className="text-xs font-bold text-content-muted">
        {from === 'me' ? t.me.messages.you : t.me.messages.us}
        {at ? ` · ${when(at)}` : ''}
      </p>
      <p
        className={cn(
          'whitespace-pre-line rounded-2xl px-4 py-2.5 text-[0.95rem]',
          from === 'me'
            ? 'rounded-tr-md bg-primary text-primary-fg'
            : 'rounded-tl-md border border-surface-border bg-background text-content',
        )}
      >
        {body}
      </p>
    </div>
  );
}

function RecentRounds({
  games,
  loading,
  error,
}: {
  games: ReturnType<typeof useMyGames>['games'];
  loading: boolean;
  error: string | null;
}): JSX.Element {
  return (
    <div className="mt-4 grid gap-2">
      {loading && (
        <p role="status" className="text-content-muted">
          {t.common.loading}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && games.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-surface-border p-6 text-center">
          <p className="text-content-muted">{t.me.empty}</p>
          <Link to="/" className={buttonClasses('primary', 'md', 'mt-3')}>
            {t.common.findAQuiz}
          </Link>
        </div>
      )}
      <ul aria-labelledby="games-title" className="grid gap-2">
        {games.slice(0, 12).map((game) => (
          <li key={game.attemptId}>
            <Card className="flex items-center justify-between gap-4 p-3.5">
              <div className="min-w-0">
                {game.quiz ? (
                  <Link
                    to={`/q/${game.quiz.slug}`}
                    className="block truncate font-bold text-content hover:text-primary"
                  >
                    {game.quiz.title}
                  </Link>
                ) : (
                  <p className="font-bold text-content-muted">{t.me.retiredQuiz}</p>
                )}
                <p className="text-sm text-content-muted">{when(game.finishedAt)}</p>
              </div>
              <p className="shrink-0 font-display text-xl font-extrabold tabular-nums">
                {game.correct}
                <span className="text-content-muted">/{game.total}</span>
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BestScores(): JSX.Element {
  const { scores, loading, error } = useBestScores();
  return (
    <div>
      <h2 className={sectionTitle}>{t.me.bestScores}</h2>
      <div className="mt-4 grid gap-2">
        {loading && (
          <p role="status" className="text-content-muted">
            {t.common.loading}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && scores.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-surface-border p-6 text-center text-content-muted">
            {t.me.bestEmpty}
          </p>
        )}
        <ul className="grid gap-2">
          {scores.slice(0, 12).map((score) => (
            <li key={score.quiz.slug}>
              <Card className="flex items-center justify-between gap-4 p-3.5">
                <div className="min-w-0">
                  <Link
                    to={`/q/${score.quiz.slug}`}
                    className="block truncate font-bold text-content hover:text-primary"
                  >
                    {score.quiz.title}
                  </Link>
                  <p className="text-sm text-content-muted">
                    {t.me.time(score.answerTimeMs)} · {when(score.finishedAt)}
                  </p>
                </div>
                <p className="shrink-0 font-display text-xl font-extrabold tabular-nums">
                  {score.correct}
                  <span className="text-content-muted">/{score.total}</span>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeleteData(): JSX.Element {
  const { error, deleteAccount } = useProfile();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return confirming ? (
    <Card role="alertdialog" aria-labelledby="delete-title" className="p-4">
      <p id="delete-title" className="font-semibold">
        {t.me.profile.confirmDelete}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={deleting}
          onClick={() => setConfirming(false)}
          autoFocus
        >
          {t.me.profile.keep}
        </Button>
        <Button
          size="sm"
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
        <p role="alert" className="mt-2">
          {error}
        </p>
      )}
    </Card>
  ) : (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="justify-self-start text-sm font-semibold text-content-muted underline underline-offset-2 hover:text-wrong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
    >
      {t.me.profile.delete}
    </button>
  );
}
