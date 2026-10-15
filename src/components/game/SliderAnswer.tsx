import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { AnswerResult, PublicSlider } from '@/types/game';

interface SliderAnswerProps {
  slider: PublicSlider;
  prompt: string;
  questionKey: string;
  result: AnswerResult | null; // set once the server has graded it
  disabled: boolean;
  onSubmit: (value: number) => void;
}

function format(value: number, unit: string | null): string {
  return unit ? `${value.toLocaleString('en-GB')} ${unit}` : value.toLocaleString('en-GB');
}

/** Native range input with a visible value; arrow keys move one step. */
export function SliderAnswer({
  slider,
  prompt,
  questionKey,
  result,
  disabled,
  onSubmit,
}: SliderAnswerProps): JSX.Element {
  const midpoint =
    slider.min + Math.round((slider.max - slider.min) / 2 / slider.step) * slider.step;
  const [value, setValue] = useState(midpoint);
  const id = useId();

  // A fresh question starts the handle in the middle again.
  useEffect(() => setValue(midpoint), [questionKey, midpoint]);

  return (
    <div className="rounded-2xl border-2 border-surface-border bg-surface p-5">
      <label htmlFor={id} className="sr-only">
        {prompt}
      </label>
      <output
        htmlFor={id}
        aria-live="polite"
        className="mb-4 block text-center font-display text-4xl font-semibold text-primary"
      >
        {format(value, slider.unit)}
      </output>
      <input
        id={id}
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        disabled={disabled || result !== null}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-12 w-full cursor-pointer accent-primary disabled:cursor-default"
      />
      <div className="mt-1 flex justify-between text-sm text-content-muted">
        <span>{format(slider.min, slider.unit)}</span>
        <span>{format(slider.max, slider.unit)}</span>
      </div>

      {result === null ? (
        <Button
          size="lg"
          className="mt-5 w-full"
          disabled={disabled}
          onClick={() => onSubmit(value)}
        >
          Lock it in
        </Button>
      ) : (
        result.correct_value !== null && (
          <p className="mt-5 text-center text-content">
            The answer is <strong>{format(result.correct_value, slider.unit)}</strong>
            {result.accept_min !== null &&
              result.accept_max !== null &&
              result.accept_min !== result.accept_max && (
                <span className="text-content-muted">
                  {' '}
                  (anything from {format(result.accept_min, slider.unit)} to{' '}
                  {format(result.accept_max, slider.unit)} counts)
                </span>
              )}
          </p>
        )
      )}
    </div>
  );
}
