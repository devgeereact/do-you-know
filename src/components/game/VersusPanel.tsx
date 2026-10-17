import type { AttemptSummary } from '@/types/game';
import { Card } from '@/components/ui/Card';

interface VersusPanelProps {
  versus: NonNullable<AttemptSummary['versus']>;
  correct: number;
  total: number;
  answerTimeMs: number;
}

function seconds(ms: number): string {
  return `${(ms / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} s`;
}

/** Head-to-head result for a friend challenge. The server decides who won. */
export function VersusPanel({
  versus,
  correct,
  total,
  answerTimeMs,
}: VersusPanelProps): JSX.Element {
  const headline = versus.tie
    ? "It's a tie!"
    : versus.you_won
      ? `You beat ${versus.creator_nickname}!`
      : `${versus.creator_nickname} wins this time`;

  return (
    <Card as="section" aria-label="Head to head" className="mt-6 text-center">
      <h2 className="text-2xl font-semibold text-content">{headline}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-background p-4">
          <p className="text-sm font-bold text-content-muted">You</p>
          <p className="font-display text-3xl font-semibold text-content">
            {correct}/{total}
          </p>
          <p className="text-xs text-content-muted">{seconds(answerTimeMs)}</p>
        </div>
        <div className="rounded-xl bg-background p-4">
          <p className="truncate text-sm font-bold text-content-muted">{versus.creator_nickname}</p>
          <p className="font-display text-3xl font-semibold text-content">
            {versus.creator_correct}/{total}
          </p>
          <p className="text-xs text-content-muted">{seconds(versus.creator_time_ms)}</p>
        </div>
      </div>
      {!versus.tie && versus.creator_correct === correct && (
        <p className="mt-3 text-sm text-content-muted">Same score, so the faster time wins.</p>
      )}
    </Card>
  );
}
