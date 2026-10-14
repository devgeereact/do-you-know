import { useCallback, useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useInngestDispatch } from '@/hooks/useInngestDispatch';
import { getSettings, updateSettings } from '@/services/settingsService';
import { getProfile } from '@/services/profileService';
import { reportError } from '@/lib/sentry';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AppSettings, Profile } from '@/types';

export function DashboardPage(): JSX.Element {
  const { user, signOut } = useSupabaseAuth();
  const { send } = useInngestDispatch();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      const [p, s] = await Promise.all([getProfile(user.id), getSettings(user.id)]);
      setProfile(p);
      setSettings(s);
    } catch (error) {
      reportError(error, { area: 'dashboard:load' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleNotifications = useCallback(async (): Promise<void> => {
    if (!user || !settings) return;
    const next = !settings.notifications_enabled;
    setSettings({ ...settings, notifications_enabled: next }); // optimistic
    try {
      await updateSettings(user.id, { notifications_enabled: next });
      // Fire a background event (fire-and-forget).
      void send('settings/updated', { userId: user.id, notifications_enabled: next });
    } catch (error) {
      setSettings({ ...settings, notifications_enabled: !next }); // rollback
      reportError(error, { area: 'dashboard:toggle' });
    }
  }, [user, settings, send]);

  const notificationsOn = settings?.notifications_enabled === true;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-8 md:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-content">Your profile</h1>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="Loading your profile" className="space-y-6">
          <div className="h-28 animate-pulse rounded-2xl bg-surface" />
          <div className="h-24 animate-pulse rounded-2xl bg-surface" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-secondary font-display text-2xl font-semibold text-secondary-fg"
            >
              {(profile?.nickname ?? '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-content-muted">
                Nickname
              </h2>
              <p className="font-display text-2xl font-semibold text-content">
                {profile?.nickname ?? 'Not picked yet'}
              </p>
            </div>
          </Card>

          <Card className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-content">Notifications</h2>
              <p className="text-sm text-content-muted">{notificationsOn ? 'On' : 'Off'}</p>
            </div>
            <Button
              size="sm"
              variant={notificationsOn ? 'ghost' : 'primary'}
              aria-pressed={notificationsOn}
              onClick={() => void toggleNotifications()}
            >
              {notificationsOn ? 'Turn off' : 'Turn on'}
            </Button>
          </Card>
        </div>
      )}
    </main>
  );
}
