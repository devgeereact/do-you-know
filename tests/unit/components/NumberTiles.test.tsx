import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberTiles } from '@/components/game/NumberTiles';
import { answerResult } from '../support/fixtures';
import type { PublicSlider } from '@/types/game';

const whole: PublicSlider = { min: 0, max: 100, step: 1, unit: null };

function setup(
  slider: PublicSlider = whole,
  props: Partial<React.ComponentProps<typeof NumberTiles>> = {},
) {
  const onSubmit = vi.fn();
  render(
    <NumberTiles
      slider={slider}
      prompt="How many?"
      questionKey="q1"
      result={null}
      disabled={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit };
}
const press = async (...keys: string[]): Promise<void> => {
  const user = userEvent.setup();
  for (const k of keys) await user.click(screen.getByRole('button', { name: k }));
};
const check = (): HTMLElement => screen.getByRole('button', { name: 'Check' });

describe('NumberTiles', () => {
  it('builds a number from taps and sends it as a value', async () => {
    const { onSubmit } = setup();
    await press('5', '6');
    await userEvent.click(check());
    expect(onSubmit).toHaveBeenCalledWith(56);
  });

  it('has no text box and no slider', () => {
    setup();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('Check waits for a number', () => {
    setup();
    expect(check()).toBeDisabled();
  });

  it('deletes the last digit and clears', async () => {
    setup();
    await press('1', '2', '3', 'Delete');
    expect(screen.getByRole('status')).toHaveTextContent('12');
    await press('Clear');
    expect(screen.getByRole('status')).toHaveTextContent('Tap the numbers');
  });

  it('does not stack leading zeros', async () => {
    const { onSubmit } = setup();
    await press('0', '0', '7');
    await userEvent.click(check());
    expect(onSubmit).toHaveBeenCalledWith(7);
  });

  it('refuses a number outside the range with a plain message, without asking the server', async () => {
    const { onSubmit } = setup();
    await press('2', '5', '0');
    await userEvent.click(check());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a number from 0 to 100.');
  });

  it('offers the point only when the range has fractions', async () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Point' })).not.toBeInTheDocument();
  });

  it('takes one decimal point when the range has fractions', async () => {
    const { onSubmit } = setup({ min: 0, max: 10, step: 0.5, unit: 'm' });
    await press('2', 'Point', '5', 'Point');
    await userEvent.click(check());
    expect(onSubmit).toHaveBeenCalledWith(2.5);
  });

  it('starts a decimal with a zero', async () => {
    const { onSubmit } = setup({ min: 0, max: 10, step: 0.5, unit: null });
    await press('Point', '5');
    await userEvent.click(check());
    expect(onSubmit).toHaveBeenCalledWith(0.5);
  });

  it('offers a minus only when the range has negatives', async () => {
    expect(screen.queryByRole('button', { name: 'Minus' })).not.toBeInTheDocument();
    const { onSubmit } = setup({ min: -20, max: 20, step: 1, unit: '°C' });
    await press('Minus', '4');
    await userEvent.click(check());
    expect(onSubmit).toHaveBeenCalledWith(-4);
  });

  it('locks after the answer and shows the right number', () => {
    setup(
      { ...whole, unit: 'legs' },
      { result: answerResult({ is_correct: false, correct_value: 8 }) },
    );
    expect(screen.getByText(/the answer is/i)).toHaveTextContent('8 legs');
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
  });
});
