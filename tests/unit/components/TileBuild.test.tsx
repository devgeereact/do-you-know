import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TileBuild } from '@/components/game/TileBuild';
import { answerResult } from '../support/fixtures';
import type { PublicBuild } from '@/types/game';

const spell: PublicBuild = {
  variant: 'spell',
  slots: 3,
  tiles: [
    { id: 'h1', label: 'c' },
    { id: 'h2', label: 'a' },
    { id: 'h3', label: 't' },
    { id: 'h4', label: 'x' },
  ],
};
const gap: PublicBuild = {
  variant: 'gap',
  slots: 2,
  template: 'The cat ___ on the ___.',
  tiles: [
    { id: 'g1', label: 'sat' },
    { id: 'g2', label: 'mat' },
    { id: 'g3', label: 'dog' },
  ],
};
const order: PublicBuild = {
  variant: 'order',
  slots: 3,
  tiles: [
    { id: 'o1', label: 'noon' },
    { id: 'o2', label: 'night' },
    { id: 'o3', label: 'morning' },
  ],
};

function setup(build: PublicBuild, props: Partial<React.ComponentProps<typeof TileBuild>> = {}) {
  const onSubmit = vi.fn();
  const view = render(
    <TileBuild
      build={build}
      prompt="Spell it"
      questionKey="q1"
      result={null}
      disabled={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit, ...view };
}
const tile = (label: string): HTMLElement => {
  const list = screen.getByRole('list', { name: /tiles to tap/i });
  return within(list).getByRole('button', { name: label });
};
const check = (): HTMLElement => screen.getByRole('button', { name: 'Check' });

describe('TileBuild', () => {
  it('starts with every space empty and Check not ready', () => {
    setup(spell);
    expect(screen.getAllByRole('button', { name: /space \d of 3, empty/i })).toHaveLength(3);
    expect(check()).toBeDisabled();
  });

  it('sends the tapped tile handles in slot order', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup(spell);
    await user.click(tile('c'));
    await user.click(tile('a'));
    await user.click(tile('t'));
    expect(check()).toBeEnabled();
    await user.click(check());
    expect(onSubmit).toHaveBeenCalledWith(['h1', 'h2', 'h3']);
  });

  it('fills the next empty space and uses each tile once', async () => {
    const user = userEvent.setup();
    setup(spell);
    await user.click(tile('t'));
    expect(tile('t')).toBeDisabled();
    expect(screen.getByRole('button', { name: /space 1 of 3: t/i })).toBeInTheDocument();
  });

  it('gives a tile back when its space is tapped, and the next tile takes that space', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup(spell);
    await user.click(tile('c'));
    await user.click(tile('a'));
    await user.click(screen.getByRole('button', { name: /space 1 of 3: c/i }));
    expect(tile('c')).toBeEnabled();
    await user.click(tile('t'));
    await user.click(tile('x'));
    await user.click(check());
    expect(onSubmit).toHaveBeenCalledWith(['h3', 'h2', 'h4']);
  });

  it('Undo takes back the last tile placed, whichever space it is in', async () => {
    const user = userEvent.setup();
    setup(spell);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await user.click(tile('c'));
    await user.click(tile('a'));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(tile('a')).toBeEnabled();
    expect(tile('c')).toBeDisabled();
  });

  it('announces placements for screen readers', async () => {
    const user = userEvent.setup();
    setup(spell);
    await user.click(tile('c'));
    expect(screen.getByRole('status')).toHaveTextContent('c placed in space 1 of 3');
    await user.click(screen.getByRole('button', { name: /space 1 of 3: c/i }));
    expect(screen.getByRole('status')).toHaveTextContent('c taken back');
  });

  it('puts gaps inside the sentence', async () => {
    const user = userEvent.setup();
    const { onSubmit, container } = setup(gap);
    expect(container.textContent).toContain('The cat');
    expect(container.textContent).toContain('on the');
    await user.click(tile('sat'));
    await user.click(tile('mat'));
    await user.click(check());
    expect(onSubmit).toHaveBeenCalledWith(['g1', 'g2']);
  });

  it('numbers the cards when ordering', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup(order);
    await user.click(tile('morning'));
    await user.click(tile('noon'));
    await user.click(tile('night'));
    await user.click(check());
    expect(onSubmit).toHaveBeenCalledWith(['o3', 'o1', 'o2']);
  });

  it('does nothing while disabled', async () => {
    const user = userEvent.setup();
    setup(spell, { disabled: true });
    expect(tile('c')).toBeDisabled();
    fireEvent.click(tile('c'));
    await user.click(screen.getByRole('button', { name: /space 1 of 3, empty/i }));
    expect(check()).toBeDisabled();
  });

  it('starts empty again for the next question', async () => {
    const user = userEvent.setup();
    const { rerender } = setup(spell);
    await user.click(tile('c'));
    rerender(
      <TileBuild
        build={spell}
        prompt="Next"
        questionKey="q2"
        result={null}
        disabled={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(tile('c')).toBeEnabled();
  });

  it('after a wrong answer shows the right one and locks the tiles', () => {
    setup(spell, {
      result: answerResult({ is_correct: false, correct_tiles: ['c', 'a', 't'] }),
    });
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(tile('c')).toBeDisabled();
  });

  it('phrases are spaced when the answer is shown', () => {
    setup(order, {
      result: answerResult({ is_correct: false, correct_tiles: ['morning', 'noon', 'night'] }),
    });
    expect(screen.getByText('morning noon night')).toBeInTheDocument();
  });

  it('shows nothing extra after a right answer', () => {
    setup(spell, { result: answerResult({ is_correct: true, correct_tiles: ['c', 'a', 't'] }) });
    expect(screen.queryByText(/the answer is/i)).not.toBeInTheDocument();
  });
});
