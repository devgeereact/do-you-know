import { useState } from 'react';
import type { PublicQuestion } from '@/types/game';
import { Button } from '@/components/ui/Button';
import { copy } from '@/lib/copy';

interface SliderAnswerProps {
  question: PublicQuestion;
  disabled: boolean;
  onAnswer: (value: number) => Promise<void>;
}
export function SliderAnswer({
  question,
  disabled,
  onAnswer,
}: SliderAnswerProps): JSX.Element | null {
  const slider = question.slider;
  const [value, setValue] = useState(slider?.min ?? 0);
  if (!slider) return null;
  return (
    <div className="grid gap-5">
      <label htmlFor="quiz-slider" className="text-xl font-bold text-content">
        {value} {slider.unit}
      </label>
      <input
        id="quiz-slider"
        type="range"
        aria-label={question.prompt}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        disabled={disabled}
        className="min-h-tap w-full accent-primary"
      />
      <div aria-hidden="true" className="flex justify-between text-base text-content-muted">
        <span>{slider.min}</span>
        <span>{slider.max}</span>
      </div>
      <Button disabled={disabled} onClick={() => void onAnswer(value)}>
        {copy.game.submit}
      </Button>
    </div>
  );
}
