import { useEffect, useRef, useState } from 'react';
import {
  getIdentity,
  setAgeBand,
  shuffleNickname,
  type PlayerIdentity,
} from '@/services/identityService';
import { reportError } from '@/lib/sentry';
import { gameErrorMessage, isGameError } from '@/lib/gameErrors';
import { copy } from '@/lib/copy';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { AgeBand } from '@/types';

interface IdentitySettingsProps {
  userId: string;
  onSaved: () => Promise<void>;
}
export function IdentitySettings({ userId, onSaved }: IdentitySettingsProps): JSX.Element {
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [band, setBand] = useState<AgeBand | ''>('');
  const locked = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getIdentity(userId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setIdentity(data);
          setBand(data?.age_band ?? '');
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          reportError(cause, { feature: 'identity' });
          setError(copy.compete.identityError);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, reload]);
  const change = async (action: () => Promise<void>): Promise<void> => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await action();
      setSaved(true);
      await onSaved();
    } catch (cause) {
      const fault =
        cause &&
        typeof cause === 'object' &&
        'message' in cause &&
        typeof cause.message === 'string'
          ? { message: cause.message }
          : undefined;
      if (!isGameError(fault)) reportError(cause, { feature: 'identity-save' });
      setError(isGameError(fault) ? gameErrorMessage(fault) : copy.compete.identityError);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <Card className="grid gap-4">
      <h2 className="font-display text-2xl font-semibold text-content">{copy.compete.identity}</h2>
      <p className="text-content-muted">{copy.compete.identityNote}</p>
      {loading ? (
        <p role="status" className="text-content">
          {copy.progress.loading}
        </p>
      ) : identity ? (
        <>
          <p className="font-display text-xl font-semibold text-content">
            {identity.nickname ?? copy.progress.guest}
          </p>
          <Button
            disabled={busy}
            onClick={() =>
              void change(async () => {
                const nickname = await shuffleNickname();
                setIdentity({ ...identity, nickname });
              })
            }
          >
            {identity.nickname ? copy.compete.shuffle : copy.compete.choose}
          </Button>
          <label className="grid gap-2 font-bold text-content">
            {copy.compete.age}
            <select
              value={band}
              disabled={busy || identity.age_band !== null}
              onChange={(event) => setBand(event.target.value as AgeBand | '')}
              className="min-h-tap rounded-xl border-2 border-surface-border bg-surface px-4 text-content"
            >
              <option value="">{copy.compete.chooseAge}</option>
              <option value="under_13">{copy.compete.under13}</option>
              <option value="13_17">{copy.compete.teen}</option>
              <option value="18_plus">{copy.compete.adult}</option>
            </select>
          </label>
          <p className="text-content-muted">
            {identity.age_band ? copy.compete.ageLocked : copy.compete.ageNote}
          </p>
          {!identity.age_band && (
            <Button
              variant="ghost"
              disabled={!band || busy}
              onClick={() => {
                if (band)
                  void change(async () => {
                    await setAgeBand(band);
                    setIdentity({ ...identity, age_band: band });
                  });
              }}
            >
              {copy.compete.saveAge}
            </Button>
          )}
        </>
      ) : (
        <Button onClick={() => setReload((value) => value + 1)}>{copy.catalog.retry}</Button>
      )}
      {error && (
        <p role="alert" className="text-content">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-content">
          {copy.compete.saved}
        </p>
      )}
    </Card>
  );
}
