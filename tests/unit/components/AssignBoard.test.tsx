import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssignBoard } from '@/components/game/AssignBoard';
import { answerResult } from '../support/fixtures';
import type { PublicAssign } from '@/types/game';

const match: PublicAssign = {
  variant: 'match',
  items: [
    { id: 'i1', label: 'Fish' },
    { id: 'i2', label: 'Bird' },
  ],
  targets: [
    { id: 't1', label: 'Sea' },
    { id: 't2', label: 'Nest' },
  ],
};
const sort: PublicAssign = {
  variant: 'sort',
  items: [
    { id: 'i1', label: '3' },
    { id: 'i2', label: '8' },
    { id: 'i3', label: '5' },
  ],
  targets: [
    { id: 't1', label: 'Odd' },
    { id: 't2', label: 'Even' },
  ],
};

function setup(
  assign: PublicAssign,
  props: Partial<React.ComponentProps<typeof AssignBoard>> = {},
) {
  const onSubmit = vi.fn();
  const view = render(
    <AssignBoard
      assign={assign}
      prompt="Match them"
      questionKey="q1"
      result={null}
      disabled={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit, ...view };
}
const tray = (): HTMLElement => screen.getByRole('list', { name: /things to place/i });
const item = (label: string): HTMLElement => within(tray()).getByRole('button', { name: label });
const trayHas = (label: string): boolean =>
  within(tray()).queryByRole('button', { name: new RegExp(`^${label}`) }) !== null;
const target = (label: string): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(`put it in ${label}`, 'i') });
const check = (): HTMLElement => screen.getByRole('button', { name: 'Check' });

describe('AssignBoard', () => {
  it('starts with every item in the tray and Check not ready', () => {
    setup(match);
    expect(within(tray()).getAllByRole('button')).toHaveLength(2);
    expect(check()).toBeDisabled();
  });

  it('places an item by tapping it, then the place it goes', async () => {
    const user = userEvent.setup();
    setup(match);
    await user.click(item('Fish'));
    expect(item('Fish')).toHaveAttribute('aria-pressed', 'true');
    await user.click(target('Sea'));
    expect(trayHas('Fish')).toBe(false);
    expect(screen.getByRole('button', { name: /fish is in sea/i })).toBeInTheDocument();
  });

  it('picking the same item again puts it down', async () => {
    const user = userEvent.setup();
    setup(match);
    await user.click(item('Fish'));
    await user.click(item('Fish'));
    expect(item('Fish')).toHaveAttribute('aria-pressed', 'false');
  });

  it('does nothing when a place is tapped with nothing picked', async () => {
    const user = userEvent.setup();
    setup(match);
    await user.click(target('Sea'));
    expect(within(tray()).getAllByRole('button')).toHaveLength(2);
  });

  it('lets a match partner hold one item only', async () => {
    const user = userEvent.setup();
    setup(match);
    await user.click(item('Fish'));
    await user.click(target('Sea'));
    await user.click(item('Bird'));
    expect(target('Sea')).toBeDisabled();
    await user.click(target('Nest'));
    expect(trayHas('Bird')).toBe(false);
  });

  it('lets a sort group hold several items', async () => {
    const user = userEvent.setup();
    setup(sort);
    await user.click(item('3'));
    await user.click(target('Odd'));
    await user.click(item('5'));
    await user.click(target('Odd'));
    expect(screen.getByRole('button', { name: /3 is in odd/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /5 is in odd/i })).toBeInTheDocument();
  });

  it('takes a placed item back to the tray when it is tapped', async () => {
    const user = userEvent.setup();
    setup(match);
    await user.click(item('Fish'));
    await user.click(target('Sea'));
    await user.click(screen.getByRole('button', { name: /fish is in sea/i }));
    expect(trayHas('Fish')).toBe(true);
    expect(check()).toBeDisabled();
  });

  it('sends every [item, place] pair once all are placed', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup(match);
    await user.click(item('Fish'));
    await user.click(target('Sea'));
    expect(check()).toBeDisabled();
    await user.click(item('Bird'));
    await user.click(target('Nest'));
    expect(check()).toBeEnabled();
    await user.click(check());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        ['i1', 't1'],
        ['i2', 't2'],
      ]),
    );
    expect(onSubmit.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('cannot be changed while the answer is being graded', async () => {
    const user = userEvent.setup();
    setup(match, { disabled: true });
    expect(item('Fish')).toBeDisabled();
    await user.click(item('Fish'));
    expect(check()).toBeDisabled();
  });

  it('marks each placed item right or wrong once graded and shows the answer if any is wrong', async () => {
    const user = userEvent.setup();
    const { rerender } = setup(match);
    await user.click(item('Fish'));
    await user.click(target('Nest'));
    await user.click(item('Bird'));
    await user.click(target('Sea'));
    rerender(
      <AssignBoard
        assign={match}
        prompt="Match them"
        questionKey="q1"
        result={answerResult({
          is_correct: false,
          correct_pairs: [
            ['Fish', 'Sea'],
            ['Bird', 'Nest'],
          ],
        })}
        disabled={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText(/the answer is/i)).toHaveTextContent('Fish → Sea; Bird → Nest');
    expect(screen.getByRole('button', { name: /fish is in nest/i })).toHaveAttribute(
      'data-state',
      'wrong',
    );
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
  });

  it('shows no answer line when everything was right', async () => {
    const user = userEvent.setup();
    const { rerender } = setup(match);
    await user.click(item('Fish'));
    await user.click(target('Sea'));
    await user.click(item('Bird'));
    await user.click(target('Nest'));
    rerender(
      <AssignBoard
        assign={match}
        prompt="Match them"
        questionKey="q1"
        result={answerResult({
          is_correct: true,
          correct_pairs: [
            ['Fish', 'Sea'],
            ['Bird', 'Nest'],
          ],
        })}
        disabled={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByText(/the answer is/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fish is in sea/i })).toHaveAttribute(
      'data-state',
      'right',
    );
  });

  it('starts empty again for the next question', async () => {
    const user = userEvent.setup();
    const { rerender } = setup(match);
    await user.click(item('Fish'));
    await user.click(target('Sea'));
    rerender(
      <AssignBoard
        assign={match}
        prompt="Match them"
        questionKey="q2"
        result={null}
        disabled={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(trayHas('Fish')).toBe(true);
  });

  it('has no text box anywhere', () => {
    setup(sort);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
