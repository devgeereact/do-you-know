import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnEnd } from '@/components/game/LearnEnd';
import { LearnTiles } from '@/components/learn/LearnTiles';
import { StickerBook } from '@/components/learn/StickerBook';
import * as profile from '@/services/profileService';
import type { LearnSummary } from '@/types/game';

const level = { current: null as string | null };
vi.mock('@/hooks/useSwitches', () => ({
  useSwitches: () => ({ switches: {}, level: level.current }),
}));
vi.mock('@/services/profileService');

const summary = (over: Partial<LearnSummary> = {}): LearnSummary => ({
  area: 'literacy',
  correct: 9,
  total: 10,
  stars: 3,
  step_before: 2,
  step_after: 3,
  stepped: 'up',
  sticker: { id: 'step-up', label: 'Level up' },
  new_stickers: ['step-up'],
  next_area: 'numeracy',
  ...over,
});
const inRouter = (ui: JSX.Element): void => {
  render(<MemoryRouter>{ui}</MemoryRouter>);
};

beforeEach(() => {
  level.current = null;
  vi.resetAllMocks();
});

describe('LearnEnd', () => {
  it('says how many stars, how the step moved, the new sticker and where to go next', () => {
    inRouter(<LearnEnd learn={summary()} />);
    expect(screen.getByRole('img', { name: '3 stars out of 3' })).toBeInTheDocument();
    expect(screen.getByText(/moved up to step 3/i)).toBeInTheDocument();
    expect(screen.getByText('Level up')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practise Numbers next' })).toHaveAttribute(
      'href',
      '/learn/numeracy',
    );
  });

  it('is gentle when the step goes down and quiet when there is no sticker', () => {
    inRouter(
      <LearnEnd
        learn={summary({
          stars: 1,
          stepped: 'down',
          step_after: 2,
          sticker: null,
          new_stickers: [],
        })}
      />,
    );
    expect(screen.getByRole('img', { name: '1 star out of 3' })).toBeInTheDocument();
    expect(screen.getByText(/a little gentler/i)).toBeInTheDocument();
    expect(screen.queryByText('You earned a sticker')).not.toBeInTheDocument();
  });
});

describe('LearnTiles', () => {
  it('shows nothing to a guest', () => {
    inRouter(<LearnTiles />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the four areas to a child, each linking to its session', () => {
    level.current = 'explorers';
    inRouter(<LearnTiles />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/learn/literacy',
      '/learn/numeracy',
      '/learn/science',
      '/learn/humanities',
    ]);
  });
});

describe('StickerBook', () => {
  it('shows earned stickers and the ones still to find', async () => {
    vi.mocked(profile.getMyLearn).mockResolvedValue({
      areas: [],
      stickers: [],
      next_area: 'literacy',
      sticker_book: [
        { id: 'perfect', label: 'Perfect round', earned: true },
        { id: 'step-up', label: 'Level up', earned: false },
      ],
    });
    render(<StickerBook />);
    expect(await screen.findByText('Perfect round')).toBeInTheDocument();
    expect(screen.getByText('Earned')).toBeInTheDocument();
    expect(screen.getByText('Not yet')).toBeInTheDocument();
  });

  it('is absent for a guest, whose request is refused', async () => {
    vi.mocked(profile.getMyLearn).mockRejectedValue(new Error('child_required'));
    const { container } = render(<StickerBook />);
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });
});
