import { useEffect, useId, useRef, useState } from 'react';
import { AgeBandPicker } from '@/components/game/AgeBandPicker';
import { Button } from '@/components/ui/Button';
import { useProfile } from '@/hooks/useProfile';
import { t } from '@/i18n';

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
      <AgeBandPicker
        busy={busy}
        error={error}
        onPick={(band) => void act(() => setAgeBand(band))}
      />
    );
  }

  if (isChild) {
    return (
      <section className="text-center">
        <h2 className="text-xl font-semibold text-content">{t.me.nickname.childTitle}</h2>
        <p aria-live="polite" className="mt-3 font-display text-3xl font-semibold text-primary">
          {profile.nickname ?? '…'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => void act(shuffleNickname)}>
            {t.me.nickname.shuffle}
          </Button>
          <Button
            disabled={busy || profile.nickname === null}
            onClick={() => profile.nickname && onDone?.(profile.nickname)}
          >
            {t.me.nickname.useThis}
          </Button>
        </div>
        {errorLine}
      </section>
    );
  }

  return (
    <section className="text-center">
      <h2 className="text-xl font-semibold text-content">{t.me.nickname.pickTitle}</h2>
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
          {t.me.nickname.label}
        </label>
        <input
          id={inputId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          placeholder={profile.nickname ?? t.me.nickname.placeholder}
          className="min-h-tap rounded-full border-2 border-surface-border bg-surface px-5 text-center font-display text-lg text-content placeholder:text-content-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary"
        />
        <p className="text-xs text-content-muted">{t.me.nickname.hint}</p>
        <Button type="submit" disabled={busy || typed.trim().length < 3}>
          {t.me.nickname.save}
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
          {t.me.nickname.random}
        </Button>
      </form>
      {errorLine}
    </section>
  );
}
