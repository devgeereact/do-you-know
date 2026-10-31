import { useEffect, useState } from 'react';
import { ClerkProvider, SignInButton, UserButton, useAuth } from '@clerk/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Page } from '@/components/ui/Page';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { env } from '@/lib/env';
import type { GetToken } from '@/services/adminService';
import { AdminConsole } from '@/pages/admin/AdminConsole';
import { linkAdultSession } from '@/services/accountService';

/**
 * Staff area at /admin. Loaded lazily with its own Clerk provider, kept out of search results,
 * and not linked from any public page. Access is decided by the server on every request.
 */
export function AdminApp(): JSX.Element {
  useDocumentMeta({ title: 'Admin', noindex: true });
  return (
    <Page>
      {env.clerkPublishableKey ? (
        <ClerkProvider publishableKey={env.clerkPublishableKey} afterSignOutUrl="/admin">
          <ClerkGate />
        </ClerkProvider>
      ) : import.meta.env.DEV ? (
        <DevTokenGate />
      ) : (
        <Card>
          <p role="status">Admin sign-in is not configured on this site.</p>
        </Card>
      )}
    </Page>
  );
}

function ClerkGate(): JSX.Element {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [linked, setLinked] = useState(false);
  // The admin guard looks up the Clerk identity row, which only exists after this call.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let live = true;
    void linkAdultSession(() => getToken())
      .catch(() => undefined)
      .finally(() => live && setLinked(true));
    return () => {
      live = false;
    };
  }, [isLoaded, isSignedIn, getToken]);
  if (!isLoaded || (isSignedIn && !linked)) return <p role="status">Loading…</p>;
  if (!isSignedIn) {
    return (
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-content-muted">Sign in with the site owner account.</p>
        <SignInButton mode="modal">
          <Button>Sign in</Button>
        </SignInButton>
      </Card>
    );
  }
  return <AdminConsole getToken={() => getToken()} account={<UserButton />} />;
}

/** Local development only (never in a production build): paste a token minted by bin/dev-admin-token.php. */
function DevTokenGate(): JSX.Element {
  const [draft, setDraft] = useState('');
  const [token, setToken] = useState<string | null>(null);
  if (token) {
    const getToken: GetToken = () => Promise.resolve(token);
    return (
      <AdminConsole
        getToken={getToken}
        account={
          <Button variant="ghost" onClick={() => setToken(null)}>
            Forget token
          </Button>
        }
      />
    );
  }
  return (
    <Card className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin (development)</h1>
      <p className="text-content-muted">No Clerk key is set. Paste a development admin token.</p>
      <label className="block">
        <span className="font-semibold">Token</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.trim())}
          className="mt-1 w-full rounded-xl border-2 border-surface-border bg-surface px-3 py-2"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <Button disabled={!draft} onClick={() => setToken(draft)}>
        Use token
      </Button>
    </Card>
  );
}
