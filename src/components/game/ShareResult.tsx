import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { shareOrCopy } from '@/lib/share';

interface ShareResultProps {
  quizSlug: string;
  quizTitle: string;
  correct: number;
  total: number;
}

/**
 * Shares the score and a link to the quiz. The text holds the score and the quiz
 * title only: no nickname, no attempt id, nothing about the player.
 */
export function ShareResult({
  quizSlug,
  quizTitle,
  correct,
  total,
}: ShareResultProps): JSX.Element {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const url = `${window.location.origin}/q/${quizSlug}`;
  const text = `I scored ${correct}/${total} on ${quizTitle} on Do You Know!`;

  const onClick = async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    try {
      const outcome = await shareOrCopy(url, text);
      if (outcome === 'copied') setStatus('Copied! Paste it anywhere you like.');
      if (outcome === 'failed') setStatus(`${text} ${url}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <Button variant="ghost" size="lg" disabled={busy} onClick={() => void onClick()}>
        Share result
      </Button>
      <p aria-live="polite" className="mt-2 break-words text-sm font-semibold text-content">
        {status}
      </p>
    </div>
  );
}
