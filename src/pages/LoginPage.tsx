import { useState, type ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/sentry';
import { env } from '@/lib/env';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * "Save your progress": Google or an email magic link — no passwords.
 * A guest (anonymous session) is UPGRADED in place, so their history, streak and
 * avatar are kept. Under-13s: a parent signs in with the parent's own email
 * (the /parent consent flow is built in Milestone 3).
 */
export function LoginPage(): JSX.Element {
  const { user } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isGuest = user?.is_anonymous === true;
  const redirectTo = `${env.appUrl || window.location.origin}/me`;

  const withBusy = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (error) {
      reportError(error, { area: 'login' });
      setMessage('Sorry, that didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = (): Promise<void> =>
    withBusy(async () => {
      // Guests link Google to their existing account (needs "manual linking" enabled).
      const { error } = isGuest
        ? await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo } })
        : await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
    });

  const sendEmailLink = (): Promise<void> =>
    withBusy(async () => {
      const { error } = isGuest
        ? await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo })
        : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      setMessage('Check your inbox — we sent you a link.');
    });

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm animate-fade-up">
        <h1 className="mb-1 text-2xl font-semibold text-content">Save your progress</h1>
        <p className="mb-6 text-content-muted">
          Keep your scores, streak and avatar on every device. No password needed.
        </p>

        <Button className="w-full" disabled={busy} onClick={() => void continueWithGoogle()}>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-sm text-content-muted">
          <span className="h-px flex-1 bg-surface-border" /> or <span className="h-px flex-1 bg-surface-border" />
        </div>

        <label className="mb-1 block text-sm text-content-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          className="mb-4 min-h-tap w-full rounded-xl border border-surface-border bg-background px-4 text-content outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          placeholder="you@example.com"
        />
        <Button
          className="w-full"
          variant="ghost"
          disabled={busy || email.length < 5}
          onClick={() => void sendEmailLink()}
        >
          Email me a sign-in link
        </Button>

        <p className="mt-5 text-center text-sm text-content-muted">
          Under 13? Ask a grown-up to save your progress with their own email.
        </p>

        {message && (
          <p role="status" className="mt-4 text-center text-content">
            {message}
          </p>
        )}
      </Card>
    </main>
  );
}
