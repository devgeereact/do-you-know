import { useState } from 'react';
import { ClerkProvider } from '@clerk/react';
import { Link } from 'react-router-dom';
import { AdultAccountControls } from '@/components/AdultAccountControls';
import { BackLink } from '@/components/BackLink';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { env } from '@/lib/env';

/** Clerk loads only after an adult enters this account flow, never during play. */
export function AccountPage(): JSX.Element {
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  useDocumentMeta({ title: 'Parent and staff accounts', noindex: true });

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4 md:px-8">
        <BackLink to="/me" label="My games" />
        <h1 className="mt-2 text-4xl font-semibold text-content">Parent and staff accounts</h1>
        <p className="mt-3 text-content-muted">
          This sign-in is for adults. Children can keep playing as guests without an account.
        </p>
        <Card className="mt-6 space-y-5 p-6">
          <p className="text-content-muted">
            Game history is not connected to these accounts yet. Signing in here does not move your
            scores or give access to staff tools.
          </p>
          {!env.clerkPublishableKey ? (
            <p role="status" className="text-content">
              Adult account sign-in is not available yet. You can still play quizzes.
            </p>
          ) : adultConfirmed ? (
            <ClerkProvider publishableKey={env.clerkPublishableKey} afterSignOutUrl="/account">
              <AdultAccountControls />
            </ClerkProvider>
          ) : (
            <Button onClick={() => setAdultConfirmed(true)}>Continue as an adult</Button>
          )}
        </Card>
        <Link
          to="/me"
          className="mt-6 inline-flex min-h-tap items-center font-semibold text-primary"
        >
          Back to my games
        </Link>
      </main>
    </>
  );
}
