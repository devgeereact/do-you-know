import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ResultsView } from '@/components/game/ResultsView';
import { summary } from '../support/fixtures';
import type { AttemptSummary } from '@/types/game';

// The board and challenge button have their own data hooks; they are stubbed so these
// tests cover only what ResultsView itself shows and decides.
vi.mock('@/components/game/ResultsBoard', () => ({
  ResultsBoard: ({ board, needsNickname }: { board: string; needsNickname: boolean }) => (
    <section aria-label="board stub">
      {board} {needsNickname ? 'needs nickname' : 'named'}
    </section>
  ),
}));
vi.mock('@/components/game/ChallengeFriend', () => ({
  ChallengeFriend: () => <button type="button">Challenge a friend</button>,
}));

function renderResults(
  data: AttemptSummary,
  props: Partial<React.ComponentProps<typeof ResultsView>> = {},
): void {
  render(
    <MemoryRouter>
      <ResultsView
        summary={data}
        quizSlug="space"
        quizTitle="Space"
        isGuest
        restarting={false}
        nextQuiz={{ slug: 'oceans', title: 'Oceans' }}
        moreTo={{ to: '/c/science', label: 'More Science quizzes' }}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('ResultsView', () => {
  it('shows the score from the server and a readable total', () => {
    renderResults(summary());
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('2 / 3 correct');
    expect(screen.getByText('Answer time 12.5 s')).toBeInTheDocument();
    expect(heading).toHaveFocus();
  });

  it.each([
    [3, 3, /perfect score/i],
    [7, 10, /brilliant/i],
    [4, 10, /nice going/i],
    [1, 3, /teaches you something/i],
    [0, 3, /teaches you something/i],
  ])('cheers %i of %i appropriately', (correct, total, copy) => {
    renderResults(summary({ correct, total }));
    expect(screen.getByText(copy)).toBeInTheDocument();
  });

  it('lists every reviewed question with the right label for each outcome', () => {
    renderResults(summary());
    const items = within(screen.getByRole('list', { name: '' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Right');
    expect(items[1]).toHaveTextContent('Not quite');
    expect(items[2]).toHaveTextContent('Time ran out');
  });

  it('shows what the player said only for wrong answers, with a clear fallback for none', () => {
    renderResults(summary());
    const items = screen.getAllByRole('listitem').filter((li) => li.textContent?.match(/^\d\./));
    expect(items[0]).not.toHaveTextContent('You said:');
    expect(items[1]).toHaveTextContent('You said:6');
    expect(items[1]).toHaveTextContent('Answer:8');
    expect(items[2]).toHaveTextContent('You said:No answer');
  });

  it('only links to web sources and opens them safely', () => {
    renderResults(summary());
    const links = screen.getAllByRole('link', { name: 'Where this comes from' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.org/spiders');
    expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(links[0]).toHaveAttribute('target', '_blank');
  });

  it('offers the next quiz and the wider list', () => {
    renderResults(summary());
    expect(screen.getByRole('link', { name: 'Next quiz' })).toHaveAttribute('href', '/q/oceans');
    const nav = screen.getByRole('navigation', { name: 'What next' });
    expect(within(nav).getByRole('link', { name: 'Next quiz: Oceans' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'More Science quizzes' })).toHaveAttribute(
      'href',
      '/c/science',
    );
  });

  it('omits the next quiz link when there is none', () => {
    renderResults(summary(), { nextQuiz: null });
    expect(screen.queryByRole('link', { name: /next quiz/i })).not.toBeInTheDocument();
  });

  it('calls onPlayAgain, and hides the button for the daily challenge', async () => {
    const onPlayAgain = vi.fn();
    renderResults(summary(), { onPlayAgain });
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('has no play again button when one play a day applies', () => {
    renderResults(summary({ mode: 'daily' }));
    expect(screen.queryByRole('button', { name: 'Play again' })).not.toBeInTheDocument();
  });

  it('disables play again while a restart is in flight', () => {
    renderResults(summary(), { onPlayAgain: vi.fn(), restarting: true });
    expect(screen.getByRole('button', { name: 'Play again' })).toBeDisabled();
  });

  it('shows the board only for ranked and daily results', () => {
    renderResults(summary({ mode: 'ranked', needs_nickname: true }));
    expect(screen.getByLabelText('board stub')).toHaveTextContent('all_time needs nickname');
  });

  it('uses the daily board for a daily result', () => {
    renderResults(summary({ mode: 'daily' }));
    expect(screen.getByLabelText('board stub')).toHaveTextContent('daily named');
  });

  it('shows no board for practice', () => {
    renderResults(summary({ mode: 'practice' }));
    expect(screen.queryByLabelText('board stub')).not.toBeInTheDocument();
  });

  it('offers a friend challenge except after a challenge game', () => {
    renderResults(summary({ mode: 'ranked' }));
    expect(screen.getByRole('button', { name: 'Challenge a friend' })).toBeInTheDocument();
  });

  it('hides the friend challenge button after a challenge game', () => {
    renderResults(summary({ mode: 'challenge' }));
    expect(screen.queryByRole('button', { name: 'Challenge a friend' })).not.toBeInTheDocument();
  });

  it('shows the head-to-head panel with the server verdict', () => {
    renderResults(
      summary({
        mode: 'challenge',
        versus: {
          creator_nickname: 'BraveOtter42',
          creator_correct: 1,
          creator_time_ms: 9000,
          you_won: true,
          tie: false,
        },
      }),
    );
    const panel = screen.getByRole('region', { name: 'Head to head' });
    expect(panel).toHaveTextContent('You beat BraveOtter42!');
    expect(panel).toHaveTextContent('2/3');
    expect(panel).toHaveTextContent('1/3');
  });

  it('says it is a tie when the server says so', () => {
    renderResults(
      summary({
        mode: 'challenge',
        versus: {
          creator_nickname: 'BraveOtter42',
          creator_correct: 2,
          creator_time_ms: 9000,
          you_won: false,
          tie: true,
        },
      }),
    );
    expect(screen.getByRole('heading', { name: "It's a tie!" })).toBeInTheDocument();
  });

  it('mentions guest play with a link to My profile only for guests', () => {
    renderResults(summary(), { isGuest: true });
    expect(screen.getByRole('link', { name: 'My profile' })).toHaveAttribute('href', '/me');
  });

  it('does not mention guest play for non-guests', () => {
    renderResults(summary(), { isGuest: false });
    expect(screen.queryByText(/playing as a guest/i)).not.toBeInTheDocument();
  });
});
