import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { freshAssign, freshBuild } from '@/lib/tileAuthoring';
import { AssignFields, BuildFields } from '@/pages/admin/TileFields';
import { QuestionPreview } from '@/pages/admin/QuestionPreview';
import type { AssignSpec, BuildSpec, QuestionContent } from '@/services/adminService';

const type = (label: RegExp | string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe('BuildFields', () => {
  it('writes a spelling question from a word, extra letters and the dictation tick', () => {
    const onChange = vi.fn();
    render(<BuildFields build={freshBuild('spell')} errors={[]} onChange={onChange} />);
    type('Word to spell', 'cat');
    expect(onChange).toHaveBeenLastCalledWith({
      variant: 'spell',
      tiles: ['c', 'a', 't'],
      answers: [['c', 'a', 't']],
    });
    type('Extra letters', 'xz');
    expect(onChange.mock.lastCall?.[0].tiles).toEqual(['c', 'a', 't', 'x', 'z']);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange.mock.lastCall?.[0].speak).toBeDefined();
  });

  it('fills the fields from a saved spelling question', () => {
    const saved: BuildSpec = {
      variant: 'spell',
      tiles: ['c', 'a', 't', 'x'],
      answers: [['c', 'a', 't']],
      speak: 'cat',
    };
    render(<BuildFields build={saved} errors={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Word to spell')).toHaveValue('cat');
    expect(screen.getByLabelText('Extra letters')).toHaveValue('x');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('writes a gap question: sentence, right words, extra words and other right answers', () => {
    const onChange = vi.fn();
    render(<BuildFields build={freshBuild('gap')} errors={[]} onChange={onChange} />);
    type('Sentence', 'The cat ___ on the ___.');
    type('Right words, in order', 'sat, mat');
    type('Extra words that look possible', 'dog');
    fireEvent.click(screen.getByRole('button', { name: /add another right answer/i }));
    type('Other right answer 1', 'sits, mat');
    expect(onChange.mock.lastCall?.[0]).toEqual({
      variant: 'gap',
      template: 'The cat ___ on the ___.',
      tiles: ['sat', 'mat', 'sits', 'dog'],
      answers: [
        ['sat', 'mat'],
        ['sits', 'mat'],
      ],
    });
  });

  it('writes an order question card by card', () => {
    const seen = vi.fn();
    // A parent that feeds the new value back in, as the editor does.
    function Harness(): JSX.Element {
      const [build, setBuild] = useState<BuildSpec>(freshBuild('order'));
      return (
        <BuildFields
          build={build}
          errors={[]}
          onChange={(b) => {
            seen(b);
            setBuild(b);
          }}
        />
      );
    }
    render(<Harness />);
    type('Card 1', 'morning');
    type('Card 2', 'noon');
    expect(seen.mock.lastCall?.[0].answers).toEqual([['morning', 'noon']]);
    fireEvent.click(screen.getByRole('button', { name: /add a card/i }));
    expect(seen.mock.lastCall?.[0].answers[0]).toHaveLength(3);
  });

  it('switching the kind starts that kind afresh', () => {
    const onChange = vi.fn();
    render(<BuildFields build={freshBuild('spell')} errors={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Kind of question'), { target: { value: 'order' } });
    expect(onChange).toHaveBeenLastCalledWith(freshBuild('order'));
  });

  it('shows the problems it is given', () => {
    render(
      <BuildFields
        build={freshBuild('spell')}
        errors={['Spelling tiles are single letters']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Spelling tiles are single letters')).toBeInTheDocument();
  });
});

describe('AssignFields', () => {
  it('writes a match question as rows of a thing and its partner', () => {
    const onChange = vi.fn();
    render(<AssignFields assign={freshAssign('match')} errors={[]} onChange={onChange} />);
    type('Thing 1', 'Fish');
    expect(onChange.mock.lastCall?.[0].items[0]).toEqual({ label: 'Fish', to: '' });
  });

  it('keeps a match pair together when its partner is typed', () => {
    const onChange = vi.fn();
    const base: AssignSpec = {
      variant: 'match',
      targets: ['', ''],
      items: [
        { label: 'Fish', to: '' },
        { label: 'Bird', to: '' },
      ],
    };
    render(<AssignFields assign={base} errors={[]} onChange={onChange} />);
    type('Partner 2', 'Nest');
    expect(onChange.mock.lastCall?.[0]).toEqual({
      variant: 'match',
      targets: ['', 'Nest'],
      items: [
        { label: 'Fish', to: '' },
        { label: 'Bird', to: 'Nest' },
      ],
    });
  });

  it('adds and removes pairs within 2 to 5', () => {
    const onChange = vi.fn();
    render(<AssignFields assign={freshAssign('match')} errors={[]} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Remove pair 1' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /add a pair/i }));
    expect(onChange.mock.lastCall?.[0].items).toHaveLength(3);
  });

  it('renaming a sort group moves its things with it', () => {
    const onChange = vi.fn();
    const sort: AssignSpec = {
      variant: 'sort',
      targets: ['Odd', 'Even'],
      items: [
        { label: '3', to: 'Odd' },
        { label: '8', to: 'Even' },
        { label: '5', to: 'Odd' },
      ],
    };
    render(<AssignFields assign={sort} errors={[]} onChange={onChange} />);
    type('Group 1', 'Odd numbers');
    expect(onChange.mock.lastCall?.[0].targets).toEqual(['Odd numbers', 'Even']);
    expect(onChange.mock.lastCall?.[0].items.map((i: { to: string }) => i.to)).toEqual([
      'Odd numbers',
      'Even',
      'Odd numbers',
    ]);
  });

  it('removing a sort group sends its things to the first group left', () => {
    const onChange = vi.fn();
    const sort: AssignSpec = {
      variant: 'sort',
      targets: ['Hot', 'Cold', 'Warm'],
      items: [
        { label: 'Fire', to: 'Hot' },
        { label: 'Ice', to: 'Cold' },
        { label: 'Tea', to: 'Warm' },
      ],
    };
    render(<AssignFields assign={sort} errors={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove group 3' }));
    expect(onChange.mock.lastCall?.[0].targets).toEqual(['Hot', 'Cold']);
    expect(onChange.mock.lastCall?.[0].items[2]).toEqual({ label: 'Tea', to: 'Hot' });
  });

  it('picks the group for each thing', () => {
    const onChange = vi.fn();
    const sort = freshAssign('sort');
    sort.targets = ['Odd', 'Even'];
    sort.items = sort.items.map((i) => ({ ...i, to: 'Odd' }));
    render(<AssignFields assign={sort} errors={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Group for thing 2'), { target: { value: 'Even' } });
    expect(onChange.mock.lastCall?.[0].items[1].to).toBe('Even');
  });
});

describe('QuestionPreview for tile questions', () => {
  const base = { explanation: 'x', source_url: null, review_by: '2027-10-01' };
  it('shows the right word and the tiles for a spelling question', () => {
    const q: QuestionContent = {
      type: 'build',
      prompt: 'Spell the pet that purrs.',
      build: { variant: 'spell', tiles: ['c', 'a', 't', 'x'], answers: [['c', 'a', 't']] },
      ...base,
    };
    render(<QuestionPreview question={q} fallbackWorld="ocean" />);
    expect(screen.getByLabelText('Tiles a child taps')).toHaveTextContent('catx');
  });

  it('shows each place with the things that belong in it for an assign question', () => {
    const q: QuestionContent = {
      type: 'assign',
      prompt: 'Sort the numbers.',
      assign: {
        variant: 'sort',
        targets: ['Odd', 'Even'],
        items: [
          { label: '3', to: 'Odd' },
          { label: '8', to: 'Even' },
          { label: '5', to: 'Odd' },
        ],
      },
      ...base,
    };
    render(<QuestionPreview question={q} fallbackWorld="ocean" />);
    expect(screen.getByText('Odd')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
