import { useState } from 'react';
import { useFriendChallenge } from '@/hooks/useFriendChallenge';
import { Button } from '@/components/ui/Button';
import { copy } from '@/lib/copy';
export function ChallengeShare({ attemptId }: { attemptId: string }): JSX.Element {
  const challenge = useFriendChallenge();
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {!url ? (
        <Button
          disabled={challenge.loading}
          variant="ghost"
          onClick={() => {
            void challenge.create(attemptId).then((result) => {
              if (result) setUrl(result.url);
            });
          }}
        >
          {copy.challenge.create}
        </Button>
      ) : (
        <>
          <a href={url} className="break-all font-bold text-primary">
            {url}
          </a>
          <Button
            variant="ghost"
            onClick={() => {
              void challenge
                .share(url, copy.challenge.shareText)
                .then((result) =>
                  setStatus(
                    result === 'copied'
                      ? copy.challenge.copied
                      : result === 'shared'
                        ? copy.challenge.shared
                        : null,
                  ),
                );
            }}
          >
            {copy.challenge.share}
          </Button>
        </>
      )}
      {challenge.error && (
        <p role="alert" className="text-content">
          {challenge.error}
        </p>
      )}
      {status && (
        <p role="status" className="text-content">
          {status}
        </p>
      )}
    </div>
  );
}
