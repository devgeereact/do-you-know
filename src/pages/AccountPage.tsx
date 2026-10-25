import { useState } from 'react';
import { ClerkProvider } from '@clerk/react';
import { Link } from 'react-router-dom';
import { AdultAccountControls } from '@/components/AdultAccountControls';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { env } from '@/lib/env';
import { Page } from '@/components/ui/Page';
import { t } from '@/i18n';

/** Clerk loads only after an adult enters this account flow, never during play. */
export function AccountPage(): JSX.Element {
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  useDocumentMeta({ title: t.account.title, noindex: true });

  return (
    <>
      <Page>
        <PageHeader
          back={{ to: '/me', label: t.common.myGames }}
          title={t.account.title}
          lead={t.account.lead}
          className="mb-6"
        />
        <Card className="space-y-5">
          <p className="text-content-muted">{t.account.notConnected}</p>
          {!env.clerkPublishableKey ? (
            <p role="status" className="text-content">
              {t.account.unavailable}
            </p>
          ) : adultConfirmed ? (
            <ClerkProvider publishableKey={env.clerkPublishableKey} afterSignOutUrl="/account">
              <AdultAccountControls />
            </ClerkProvider>
          ) : (
            <Button onClick={() => setAdultConfirmed(true)}>{t.account.continueAsAdult}</Button>
          )}
        </Card>
        <Link
          to="/me"
          className="mt-4 inline-flex min-h-tap items-center rounded-full px-1 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
        >
          {t.account.back}
        </Link>
      </Page>
    </>
  );
}
