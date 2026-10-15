import { useEffect, useRef, useState } from 'react';
import { deleteAccount, clearDeletedSession } from '@/services/profileService';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { reportError } from '@/lib/sentry';
import { copy } from '@/lib/copy';

interface AccountDeletionProps {
  userId: string;
  onDeleted: () => void;
}
export function AccountDeletion({ userId, onDeleted }: AccountDeletionProps): JSX.Element {
  const online = useOnlineStatus();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverDeleted, setServerDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const returnFocus = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming && returnFocus.current) {
      opener.current?.focus();
      returnFocus.current = false;
    }
  }, [confirming]);

  const remove = async (): Promise<void> => {
    if (lock.current || (!online && !serverDeleted)) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    let deleted = serverDeleted;
    try {
      if (!deleted) {
        await deleteAccount(userId);
        deleted = true;
        setServerDeleted(true);
      }
      await clearDeletedSession(userId);
      onDeleted();
    } catch (cause) {
      reportError(cause, { feature: deleted ? 'account-session-cleanup' : 'account-deletion' });
      setError(deleted ? copy.account.cleanupError : copy.account.error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Card className="grid gap-4">
      <h2 className="font-display text-2xl font-semibold text-content">{copy.account.heading}</h2>
      <p className="text-content-muted">{copy.account.description}</p>
      {!confirming ? (
        <Button ref={opener} variant="ghost" onClick={() => setConfirming(true)}>
          {copy.account.open}
        </Button>
      ) : (
        <div
          role="group"
          aria-labelledby="delete-confirm-heading"
          className="grid gap-4 rounded-xl border border-surface-border p-4"
        >
          <h3
            id="delete-confirm-heading"
            className="font-display text-xl font-semibold text-content"
          >
            {serverDeleted ? copy.account.cleanupHeading : copy.account.confirmHeading}
          </h3>
          <p className="text-content">
            {serverDeleted ? copy.account.cleanupNote : copy.account.warning}
          </p>
          <div className="flex flex-wrap gap-3">
            {!serverDeleted && (
              <Button
                variant="ghost"
                autoFocus
                disabled={busy}
                onClick={() => {
                  returnFocus.current = true;
                  setConfirming(false);
                  setError(null);
                }}
              >
                {copy.account.cancel}
              </Button>
            )}
            <Button disabled={busy || (!online && !serverDeleted)} onClick={() => void remove()}>
              {busy
                ? copy.account.busy
                : serverDeleted
                  ? copy.account.clearSession
                  : copy.account.confirm}
            </Button>
          </div>
          {!online && !serverDeleted && (
            <p role="status" className="text-content">
              {copy.account.offline}
            </p>
          )}
          {error && (
            <p role="alert" className="text-content">
              {error}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
