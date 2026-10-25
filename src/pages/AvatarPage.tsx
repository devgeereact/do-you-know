import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarBadge } from '@/components/AvatarBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { useReveal } from '@/hooks/useReveal';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useProfile } from '@/hooks/useProfile';
import { AVATARS } from '@/lib/avatars';
import { cn } from '@/lib/utils';
import { Page } from '@/components/ui/Page';
import { t } from '@/i18n';

/** Pick a preset avatar. Nothing is uploaded or generated, so it is safe for every age. */
export function AvatarPage(): JSX.Element {
  const { profile, error, setAvatar } = useProfile();
  const { ensureSession } = useGuestSession();
  const navigate = useNavigate();
  useDocumentMeta({ title: t.avatar.title, noindex: true });
  const [saving, setSaving] = useState<string | null>(null);
  const grid = useRef<HTMLUListElement>(null);
  useReveal(grid);

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
        <PageHeader
          back={{ to: '/me', label: t.common.myGames }}
          title={t.avatar.title}
          lead={t.avatar.lead}
          className="mb-6"
        />
        {error && (
          <p role="alert" className="mt-4 text-content">
            {error}
          </p>
        )}
        <ul ref={grid} className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
          {AVATARS.map((avatar) => {
            const current = profile?.avatar_id === avatar.id;
            return (
              <li key={avatar.id} data-reveal>
                <button
                  type="button"
                  disabled={saving !== null}
                  aria-pressed={current}
                  onClick={() => void choose(avatar.id)}
                  className={cn(
                    'group relative flex w-full min-h-tap flex-col items-center gap-2 rounded-2xl border-2 p-3 font-semibold text-content transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 disabled:cursor-default',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    current
                      ? 'border-primary bg-primary/5'
                      : 'border-surface-border bg-surface hover:border-primary/40',
                    saving === avatar.id && 'opacity-60',
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
                  <span className="transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110">
                    <AvatarBadge avatarId={avatar.id} size="md" />
                  </span>
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
