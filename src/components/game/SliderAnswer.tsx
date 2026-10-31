import { useEffect, useId, useState } from 'react';
import type { AnswerResult, PublicSlider } from '@/types/game';
import { t } from '@/i18n';

interface SliderAnswerProps {
  slider: PublicSlider;
  prompt: string;
  questionKey: string;
  result: AnswerResult | null; // set once the server has graded it
  disabled: boolean;
  onSubmit: (value: number) => void;
}

function format(value: number, unit: string | null): string {
  return unit ? `${value.toLocaleString(t.locale)} ${unit}` : value.toLocaleString(t.locale);
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
    <div className="w-full max-w-xl rounded-[1.75rem] border-[3px] border-[var(--fd)] bg-white p-5 text-[#17153A] shadow-[0_4px_0_var(--fd)]">
      <label htmlFor={id} className="sr-only">
        {prompt}
      </label>
      <output
        htmlFor={id}
        aria-live="polite"
        className="mb-2 block text-center font-display text-4xl font-extrabold text-[var(--fd)]"
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
        className="h-12 w-full cursor-pointer accent-[var(--fd)] disabled:cursor-default"
      />
      <div className="mt-1 flex justify-between text-sm font-semibold opacity-60">
        <span>{format(slider.min, slider.unit)}</span>
        <span>{format(slider.max, slider.unit)}</span>
      </div>

      {result === null ? (
        <button
          type="button"
          className="mt-4 h-12 w-full rounded-full bg-[var(--fd)] font-display text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_rgb(0_0_0/0.25)] transition-transform active:translate-y-[3px] disabled:opacity-50"
          disabled={disabled}
          onClick={() => onSubmit(value)}
        >
          {t.play.slider.lockIn}
        </button>
      ) : (
        result.correct_value !== null && (
          <p className="mt-4 text-center font-semibold">
            {t.play.slider.answerIs} <strong>{format(result.correct_value, slider.unit)}</strong>
            {result.accept_min !== null &&
              result.accept_max !== null &&
              result.accept_min !== result.accept_max && (
                <span className="opacity-70">
                  {' '}
                  {t.play.slider.range(
                    format(result.accept_min, slider.unit),
                    format(result.accept_max, slider.unit),
                  )}
                </span>
              )}
          </p>
        )
      )}
    </div>
  );
}
