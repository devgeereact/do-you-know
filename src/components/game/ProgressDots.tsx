import { cn } from '@/lib/utils';

interface ProgressDotsProps {
  position: number; // 1-based
  total: number;
}

/** "Question 3 of 10" with a dot per question. The text is what screen readers hear. */
export function ProgressDots({ position, total }: ProgressDotsProps): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="whitespace-nowrap text-sm font-bold text-content-muted">
        Question {position} of {total}
      </span>
      <ol aria-hidden="true" className="flex flex-wrap gap-1">
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            className={cn(
              'h-2 w-2 rounded-full',
              i + 1 < position && 'bg-primary',
              i + 1 === position && 'w-4 bg-secondary',
              i + 1 > position && 'bg-surface-border',
            )}
          />
        ))}
      </ol>
    </div>
  );
}
