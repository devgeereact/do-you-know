import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useProfile } from '@/hooks/useProfile';
import type { AgeBand } from '@/types';

const BANDS: { band: AgeBand; label: string }[] = [
  { band: 'under_13', label: 'Under 13' },
  { band: '13_17', label: '13 to 17' },
  { band: '18_plus', label: '18 or over' },
];

interface NicknamePickerProps {
  onDone?: (nickname: string) => void;
}

/**
 * Age band once, then a nickname. Under-13s only get generated nicknames
 * ("BraveOtter42") and can shuffle; 13+ may type their own. Nothing here asks
 * for a real name, birthday or anything else personal.
 */
export function NicknamePicker({ onDone }: NicknamePickerProps): JSX.Element | null {
  const { profile, isChild, loading, error, setAgeBand, shuffleNickname, setNickname } =
    useProfile();
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const autoShuffled = useRef(false);
  const inputId = useId();

  const act = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  // A child gets a generated nickname straight away (once); they can shuffle it.
  useEffect(() => {
    if (autoShuffled.current || !profile || !isChild || profile.nickname !== null) return;
    autoShuffled.current = true;
    setBusy(true);
    void shuffleNickname().finally(() => setBusy(false));
  }, [profile, isChild, shuffleNickname]);

  if (loading || !profile) return null;

  const errorLine = error && (
    <p role="alert" className="mt-3 text-content">
      {error}
    </p>
  );

  if (profile.age_band === null) {
    return (
      <section aria-labelledby={`${inputId}-age`} className="text-center">
        <h2 id={`${inputId}-age`} className="text-xl font-semibold text-content">
          How old are you?
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-content-muted">
          This keeps the game safe for everyone. You can only choose once.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {BANDS.map(({ band, label }) => (
            <Button
              key={band}
              variant="ghost"
              disabled={busy}
              onClick={() => void act(() => setAgeBand(band))}
            >
              {label}
            </Button>
          ))}
        </div>
        {errorLine}
      </section>
    );
  }

  if (isChild) {
    return (
      <section className="text-center">
        <h2 className="text-xl font-semibold text-content">Your leaderboard name</h2>
        <p aria-live="polite" className="mt-3 font-display text-3xl font-semibold text-primary">
          {profile.nickname ?? '…'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => void act(shuffleNickname)}>
            Shuffle
          </Button>
          <Button
            disabled={busy || profile.nickname === null}
            onClick={() => profile.nickname && onDone?.(profile.nickname)}
          >
            Use this name
          </Button>
        </div>
        {errorLine}
      </section>
    );
  }

  return (
    <section className="text-center">
      <h2 className="text-xl font-semibold text-content">Pick a leaderboard name</h2>
      <form
        className="mx-auto mt-4 flex max-w-sm flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            if (await setNickname(typed)) onDone?.(typed.trim());
          });
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Nickname
        </label>
        <input
          id={inputId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          placeholder={profile.nickname ?? 'e.g. QuizWhizz'}
          className="min-h-tap rounded-full border-2 border-surface-border bg-surface px-5 text-center font-display text-lg text-content placeholder:text-content-muted focus-visible:border-primary focus-visible:outline-none"
        />
        <p className="text-xs text-content-muted">
          3–20 letters or numbers. Please don’t use your real name.
        </p>
        <Button type="submit" disabled={busy || typed.trim().length < 3}>
          Save name
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void act(async () => {
              const nick = await shuffleNickname();
              if (nick) onDone?.(nick);
            })
          }
        >
          Give me a random one
        </Button>
      </form>
      {errorLine}
    </section>
  );
}
