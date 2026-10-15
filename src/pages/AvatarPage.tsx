import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AgeBandPicker } from '@/components/game/AgeBandPicker';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/Button';
import { TRAIT_KEYS, useAvatarBuilder } from '@/hooks/useAvatarBuilder';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useProfile } from '@/hooks/useProfile';
import { cn, isWebUrl } from '@/lib/utils';
import type { AvatarTraits } from '@/types/game';

const TRAIT_LABELS: Record<keyof AvatarTraits, string> = {
  age_look: 'Look',
  skin_tone: 'Skin tone',
  face_shape: 'Face shape',
  hair_style: 'Hair style',
  hair_colour: 'Hair colour',
  eye_colour: 'Eye colour',
  outfit: 'Outfit',
  outfit_colour: 'Outfit colour',
  accessory: 'Extra',
  facial_hair: 'Facial hair',
};

/** "light-olive" → "Light olive". */
function humanise(value: string): string {
  const text = value.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const STATUS_TEXT = {
  pending: 'Painting your avatar… this takes about 10 to 30 seconds.',
  generating: 'Painting your avatar… nearly there.',
  failed: 'That one didn’t work out. Please try again.',
  rejected: 'We couldn’t use that one. Try a different look.',
} as const;

/**
 * The avatar builder needs an age band first (the server refuses without one),
 * so a child can never pick the adult look. Ask, then mount the builder fresh.
 */
export function AvatarPage(): JSX.Element {
  const { profile, loading, error, setAgeBand } = useProfile();
  const { ensureSession } = useGuestSession();
  const [busy, setBusy] = useState(false);

  // Someone landing here directly still gets a guest session (no email).
  useEffect(() => {
    ensureSession().catch(() => undefined);
  }, [ensureSession]);

  if (profile?.age_band) return <AvatarBuilder />;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-4 md:px-8">
        <Link to="/me" className="inline-flex min-h-tap items-center font-semibold text-primary">
          <span aria-hidden="true">←&nbsp;</span>My games
        </Link>
        <h1 className="mt-2 text-4xl font-semibold text-content">Make my avatar</h1>
        <div className="mt-8 rounded-2xl border-2 border-surface-border bg-surface p-6">
          {loading || !profile ? (
            <p role="status" className="text-center text-content-muted">
              Loading…
            </p>
          ) : (
            <AgeBandPicker
              busy={busy}
              error={error}
              onPick={(band) => {
                setBusy(true);
                void setAgeBand(band).finally(() => setBusy(false));
              }}
            />
          )}
        </div>
      </main>
    </>
  );
}

function AvatarBuilder(): JSX.Element {
  const builder = useAvatarBuilder();
  const navigate = useNavigate();
  const { traits, options, status, avatar, ready, error, remainingToday } = builder;
  const painting = status === 'pending' || status === 'generating';

  useEffect(() => {
    document.title = 'Make my avatar · Do You Know';
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 md:px-8">
        <Link to="/me" className="inline-flex min-h-tap items-center font-semibold text-primary">
          <span aria-hidden="true">←&nbsp;</span>My games
        </Link>
        <h1 className="mt-2 text-4xl font-semibold text-content">Make my avatar</h1>
        <p className="mt-2 max-w-prose text-content-muted">
          Pick a look and we’ll paint a cartoon portrait just for you. Every look is one of a kind,
          so no two players match. We never use photos.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr] lg:items-start">
          <section
            aria-label="Your avatar"
            className="rounded-2xl border-2 border-surface-border bg-surface p-6 text-center lg:sticky lg:top-4"
          >
            {status === 'ready' && avatar && isWebUrl(avatar.image_url) ? (
              <img
                src={avatar.image_url}
                alt="Your new avatar"
                className="mx-auto aspect-square w-48 rounded-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className={cn(
                  'mx-auto grid aspect-square w-48 place-items-center rounded-full bg-sky/30',
                  painting && 'motion-safe:animate-pulse',
                )}
              >
                <span className="font-display text-6xl font-semibold text-primary">?</span>
              </div>
            )}

            <p aria-live="polite" className="mt-4 min-h-[3rem] text-content">
              {status !== 'idle' && status !== 'ready' && STATUS_TEXT[status]}
              {status === 'ready' && 'Here you are! Like it?'}
            </p>

            {status === 'ready' ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => void builder.useAvatar().then((ok) => ok && navigate('/me'))}
              >
                Use this avatar
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full"
                disabled={!ready || painting || remainingToday === 0}
                onClick={() => void builder.generate()}
              >
                Paint my avatar
              </Button>
            )}
            <p className="mt-2 text-sm text-content-muted">
              {remainingToday} {remainingToday === 1 ? 'go' : 'goes'} left today
            </p>
            {error && (
              <p role="alert" className="mt-3 font-semibold text-content">
                {error}
              </p>
            )}
          </section>

          {/* min-w-0: grid items and fieldsets default to min-content width, which would
              let the scrolling chip rows stretch the whole page on phones. */}
          <section aria-label="Choose your look" className="min-w-0">
            <div className="mb-4 flex justify-end">
              <Button variant="ghost" disabled={!ready || painting} onClick={builder.randomise}>
                Surprise me
              </Button>
            </div>
            {ready && (
              <div className="grid min-w-0 gap-6">
                {TRAIT_KEYS.map((key) =>
                  (options[key]?.length ?? 0) > 1 ? (
                    <fieldset key={key} disabled={painting} className="min-w-0">
                      <legend className="mb-2 font-display text-lg font-semibold text-content">
                        {TRAIT_LABELS[key]}
                      </legend>
                      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
                        {options[key].map((value) => {
                          const checked = traits[key] === value;
                          return (
                            <label
                              key={value}
                              className={cn(
                                // relative: keeps the visually hidden radio inside the scroll row.
                                'relative inline-flex min-h-tap shrink-0 cursor-pointer items-center rounded-full border-2 px-4 font-semibold',
                                'focus-within:ring-[3px] focus-within:ring-secondary',
                                checked
                                  ? 'border-primary bg-primary text-primary-fg'
                                  : 'border-surface-border bg-surface text-content',
                              )}
                            >
                              <input
                                type="radio"
                                name={key}
                                value={value}
                                checked={checked}
                                onChange={() =>
                                  builder.setTrait(key, value as AvatarTraits[typeof key])
                                }
                                className="sr-only"
                              />
                              {humanise(value)}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : null,
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
