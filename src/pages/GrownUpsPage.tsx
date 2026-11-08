import { useCallback, useEffect, useState } from 'react';
import { ClerkProvider, SignInButton, SignUpButton, useAuth, useClerk } from '@clerk/react';
import { ChildrenPanel } from '@/components/parent/ChildrenPanel';
import { ContactPanel } from '@/components/parent/ContactPanel';
import { SwitchesPanel } from '@/components/parent/SwitchesPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Page } from '@/components/ui/Page';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { adoptGuestToken, clearSession } from '@/lib/api';
import { env } from '@/lib/env';
import { linkAdultSession } from '@/services/accountService';
import { confirmGrownUp, handOver } from '@/services/parentService';
import type { Child } from '@/types';
import { t } from '@/i18n';

type Tab = 'children' | 'switches' | 'contact';
const copy = t.grownUps;

/** A calm placeholder while Clerk and the parent record load, so the page never looks broken. */
function ParentLoading(): JSX.Element {
  return (
    <Card role="status" className="grid gap-3" aria-live="polite">
      <p className="font-semibold">{copy.loading}</p>
      <div aria-hidden="true" className="grid gap-2 motion-safe:animate-pulse">
        <div className="h-4 w-2/3 rounded-full bg-surface-border" />
        <div className="h-4 w-1/2 rounded-full bg-surface-border" />
        <div className="h-10 w-40 rounded-full bg-surface-border" />
      </div>
    </Card>
  );
}

/** The signed-in parent area. Clerk gives the session token; every call is scoped to this parent on the server. */
function ParentArea(): JSX.Element {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('children');
  const token = useCallback(() => getToken(), [getToken]);

  // The server needs the identity row before any parent call, and a grown-up may use typed fields.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setReady(false);
      return;
    }
    let active = true;
    void linkAdultSession(token)
      .then(() => confirmGrownUp(token))
      .catch(() => undefined)
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, token]);

  async function handOverTo(child: Child): Promise<void> {
    const session = await handOver(token, child.id);
    // The device now plays as the child. Signing the parent out is what makes the next visit here ask for a new code.
    adoptGuestToken({ token: session.token, expires_at: session.expires_at });
    try {
      await signOut({ redirectUrl: '/' });
    } catch (err) {
      // Still signed in as the parent: do not leave this device half handed over.
      clearSession();
      throw err;
    }
  }

  if (!isLoaded) return <ParentLoading />;

  if (!isSignedIn) {
    return (
      <Card className="grid gap-4">
        <h2 className="text-2xl font-bold">{copy.signInTitle}</h2>
        <p className="text-content-muted">{copy.signInBody}</p>
        <ul className="grid gap-2">
          {copy.whatYouGet.map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <SignInButton mode="modal">
            <Button>{copy.signIn}</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="ghost">{copy.signUp}</Button>
          </SignUpButton>
        </div>
      </Card>
    );
  }

  if (!ready) return <ParentLoading />;

  return (
    <div className="grid gap-5">
      <SegmentedControl<Tab>
        label={copy.tabs.label}
        options={[
          { value: 'children', label: copy.tabs.children },
          { value: 'switches', label: copy.tabs.switches },
          { value: 'contact', label: copy.tabs.contact },
        ]}
        value={tab}
        onChange={setTab}
        className="w-full max-w-md"
      />
      {tab === 'children' && <ChildrenPanel getToken={token} onHandOver={handOverTo} />}
      {tab === 'switches' && <SwitchesPanel getToken={token} />}
      {tab === 'contact' && <ContactPanel getToken={token} />}
    </div>
  );
}

/** Clerk loads only here (and in the Studio), never while a child plays. */
export function GrownUpsPage(): JSX.Element {
  useDocumentMeta({ title: copy.metaTitle, noindex: true });
  return (
    <Page width="wide">
      <PageHeader title={copy.title} lead={copy.lead} className="mb-6" />
      {env.clerkPublishableKey ? (
        <ClerkProvider publishableKey={env.clerkPublishableKey} afterSignOutUrl="/grown-ups">
          <ParentArea />
        </ClerkProvider>
      ) : (
        <p role="status">{copy.unavailable}</p>
      )}
    </Page>
  );
}
