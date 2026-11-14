import { useEffect, useId, useState } from 'react';
import type { AnswerResult, PublicSlider } from '@/types/game';
import { t } from '@/i18n';

interface NumberTilesProps {
  slider: PublicSlider;
  prompt: string;
  questionKey: string;
  result: AnswerResult | null;
  disabled: boolean;
  onSubmit: (value: number) => void;
}

const MAX_CHARS = 12;

function format(value: number, unit: string | null): string {
  return unit ? `${value.toLocaleString(t.locale)} ${unit}` : value.toLocaleString(t.locale);
}

/**
 * Answer a number question by tapping a keypad of tiles: no keyboard, no dragging. It sends the same
 * `value` as the slider and the server checks it the same way. The point shows only when the range has
 * fractions, and the minus only when it has negatives.
 */
export function NumberTiles({
  slider,
  prompt,
  questionKey,
  result,
  disabled,
  onSubmit,
}: NumberTilesProps): JSX.Element {
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const outId = useId();
  useEffect(() => {
    setText('');
    setMessage('');
  }, [questionKey]);

  const fractions = [slider.min, slider.max, slider.step].some((n) => !Number.isInteger(n));
  const negatives = slider.min < 0;
  const locked = disabled || result !== null;

  function press(key: string): void {
    if (locked) return;
    setMessage('');
    setText((current) => {
      if (current.length >= MAX_CHARS) return current;
      if (key === '.')
        return current.includes('.')
          ? current
          : `${current === '' || current === '-' ? `${current}0` : current}.`;
      if (key === '-') return current === '' ? '-' : current;
      return current === '0' ? key : current === '-0' ? `-${key}` : `${current}${key}`;
    });
  }

  function check(): void {
    const value = Number(text);
    if (
      text === '' ||
      text === '-' ||
      Number.isNaN(value) ||
      value < slider.min ||
      value > slider.max
    ) {
      setMessage(
        t.play.numbers.outOfRange(format(slider.min, slider.unit), format(slider.max, slider.unit)),
      );
      return;
    }
    onSubmit(value);
  }

  const key = (label: string, onClick: () => void, name?: string): JSX.Element => (
    <button
      type="button"
      className="stage-key"
      disabled={locked}
      aria-label={name}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="flex w-full max-w-88 flex-col items-center gap-3" data-q-numbers>
      <output
        id={outId}
        aria-live="polite"
        aria-label={`${t.play.numbers.label}: ${prompt}`}
        className="flex min-h-18 w-full items-center justify-center rounded-2xl border-[3px] border-(--fd) bg-stage-paper px-4 font-display text-4xl font-extrabold tabular-nums text-stage-ink"
      >
        {text === '' ? (
          <span className="text-lg font-semibold opacity-60">{t.play.numbers.empty}</span>
        ) : (
          <>
            {text}
            {slider.unit && <span className="ml-2 text-xl opacity-70">{slider.unit}</span>}
          </>
        )}
      </output>

      <div role="group" aria-label={t.play.numbers.label} className="grid w-full grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <span key={d} className="contents">
            {key(d, () => press(d))}
          </span>
        ))}
        {fractions
          ? key('.', () => press('.'), t.play.numbers.point)
          : negatives
            ? key('−', () => press('-'), t.play.numbers.minus)
            : key('⌫', () => setText((c) => c.slice(0, -1)), t.play.numbers.delete)}
        {key('0', () => press('0'))}
        {fractions || negatives
          ? key('⌫', () => setText((c) => c.slice(0, -1)), t.play.numbers.delete)
          : key('C', () => setText(''), t.play.numbers.clear)}
        {fractions && negatives && key('−', () => press('-'), t.play.numbers.minus)}
      </div>

      {message && (
        <p role="alert" className="text-center font-semibold text-wrong">
          {message}
        </p>
      )}

      {result === null ? (
        <button
          type="button"
          className="h-14 w-full rounded-full bg-(--fd) font-display text-lg font-extrabold text-white shadow-[0_4px_0_rgb(0_0_0/0.25)] transition-transform active:translate-y-[3px] disabled:opacity-50"
          disabled={locked || text === ''}
          onClick={check}
        >
          {t.play.numbers.check}
        </button>
      ) : (
        result.correct_value !== null && (
          <p className="text-center font-semibold">
            {t.play.numbers.answerIs} <strong>{format(result.correct_value, slider.unit)}</strong>
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
