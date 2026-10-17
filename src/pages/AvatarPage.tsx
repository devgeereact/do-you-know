import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarBadge } from '@/components/AvatarBadge';
import { BackLink } from '@/components/BackLink';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useProfile } from '@/hooks/useProfile';
import { AVATARS } from '@/lib/avatars';
import { cn } from '@/lib/utils';
import { Page } from '@/components/ui/Page';

/** Pick a preset avatar. Nothing is uploaded or generated, so it is safe for every age. */
export function AvatarPage(): JSX.Element {
  const { profile, error, setAvatar } = useProfile();
  const { ensureSession } = useGuestSession();
  const navigate = useNavigate();
  useDocumentMeta({ title: 'Pick your avatar', noindex: true });
  const [saving, setSaving] = useState<string | null>(null);

  // Someone landing here directly still gets a guest session (no email).
  useEffect(() => {
    ensureSession().catch(() => undefined);
  }, [ensureSession]);

  const choose = async (id: string): Promise<void> => {
    setSaving(id);
    const ok = await setAvatar(id);
    setSaving(null);
    if (ok) navigate('/me');
  };

  return (
    <>
      <Page>
        <BackLink to="/me" label="My games" />
        <h1 className="mt-4 text-4xl font-semibold text-content">Pick your avatar</h1>
        <p className="mt-2 text-content-muted">It shows next to your name on the leaderboards.</p>
        {error && (
          <p role="alert" className="mt-4 text-content">
            {error}
          </p>
        )}
        <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
          {AVATARS.map((avatar) => {
            const current = profile?.avatar_id === avatar.id;
            return (
              <li key={avatar.id}>
                <button
                  type="button"
                  disabled={saving !== null}
                  aria-pressed={current}
                  onClick={() => void choose(avatar.id)}
                  className={cn(
                    'flex w-full min-h-tap flex-col items-center gap-2 rounded-2xl border-2 bg-surface p-3 font-semibold text-content transition',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    current ? 'border-primary' : 'border-surface-border hover:border-primary/60',
                    saving === avatar.id && 'opacity-60',
                  )}
                >
                  <AvatarBadge avatarId={avatar.id} size="md" />
                  {avatar.label}
                </button>
              </li>
            );
          })}
        </ul>
      </Page>
    </>
  );
}
