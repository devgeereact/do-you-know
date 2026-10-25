import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useFriendChallenge } from '@/hooks/useFriendChallenge';
import { t } from '@/i18n';

interface ChallengeFriendProps {
  attemptId: string;
  quizTitle: string;
  correct: number;
  total: number;
}

/**
 * Makes a challenge link for this finished game and shares it (share sheet on
 * phones, copy-to-clipboard elsewhere). The link carries a code only; the
 * friend sees a nickname and a score, never anything personal.
 */
export function ChallengeFriend({
  attemptId,
  quizTitle,
  correct,
  total,
}: ChallengeFriendProps): JSX.Element {
  const { create, share, error } = useFriendChallenge();
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const text = t.challenge.create.text(correct, total, quizTitle);

  const onClick = async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    try {
      const link = url ?? (await create(attemptId))?.url ?? null;
      if (!link) return;
      setUrl(link);
      const result = await share(link, text);
      if (result === 'shared') setStatus(t.challenge.create.sent);
      if (result === 'copied') setStatus(t.challenge.create.copied);
      if (result === 'failed') setStatus(t.challenge.create.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <Button variant="secondary" size="lg" disabled={busy} onClick={() => void onClick()}>
        {t.challenge.create.action}
      </Button>
      <p aria-live="polite" className="mt-2 text-sm font-semibold text-content">
        {status}
      </p>
      {url && (
        <p className="mt-1 break-all text-sm text-content-muted">
          <span className="sr-only">{t.challenge.create.linkLabel}</span>
          {url}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-content">
          {error}
        </p>
      )}
    </div>
  );
}
