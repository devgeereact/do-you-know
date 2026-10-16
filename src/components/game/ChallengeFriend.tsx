import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useFriendChallenge } from '@/hooks/useFriendChallenge';

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

  const text = `I scored ${correct}/${total} on ${quizTitle}. Can you beat me?`;

  const onClick = async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    try {
      const link = url ?? (await create(attemptId))?.url ?? null;
      if (!link) return;
      setUrl(link);
      const result = await share(link, text);
      if (result === 'shared') setStatus('Challenge sent!');
      if (result === 'copied') setStatus('Link copied! Send it to a friend.');
      if (result === 'failed') setStatus('Copy the link below and send it to a friend.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <Button variant="secondary" size="lg" disabled={busy} onClick={() => void onClick()}>
        Challenge a friend
      </Button>
      <p aria-live="polite" className="mt-2 text-sm font-semibold text-content">
        {status}
      </p>
      {url && (
        <p className="mt-1 break-all text-sm text-content-muted">
          <span className="sr-only">Challenge link: </span>
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
