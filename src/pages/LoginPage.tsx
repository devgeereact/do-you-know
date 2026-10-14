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
      setMessage('Check your inbox. We’ve sent you a link.');
    });

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <Card className="w-full max-w-sm animate-fade-up border-2 p-7 shadow-lift">
        <h1 className="mb-2 text-3xl font-semibold text-content">Save your progress</h1>
        <p className="mb-7 text-content-muted">
          Keep your scores, streak and avatar on every device. You won’t need a password.
        </p>

        <Button className="w-full" disabled={busy} onClick={() => void continueWithGoogle()}>
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-sm font-bold text-content-muted">
          <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-surface-border" />
          or
          <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-surface-border" />
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void sendEmailLink();
          }}
        >
          <label className="mb-2 block font-bold text-content" htmlFor="email">
            Your email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="mb-4 min-h-tap w-full rounded-full border-2 border-surface-border bg-background px-5 text-content outline-none transition-colors placeholder:text-content-muted/70 focus-visible:border-primary"
            placeholder="name@example.com"
          />
          <Button
            type="submit"
            className="w-full"
            variant="ghost"
            disabled={busy || email.length < 5}
          >
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </Button>
        </form>

        <p
          aria-live="polite"
          role="status"
          className="mt-4 min-h-[1.5rem] text-center font-bold text-content"
        >
          {message}
        </p>

        <p className="mt-2 rounded-xl bg-background px-4 py-3 text-center text-sm text-content-muted">
          Under 13? Ask a grown-up to save your progress with their own email.
        </p>
      </Card>
    </main>
  );
}
