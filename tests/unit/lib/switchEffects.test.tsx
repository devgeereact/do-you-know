import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NAV_ITEMS, visibleNav } from '@/components/navItems';
import { TabBar } from '@/components/TabBar';
import { SWITCHES_OFF } from '@/hooks/useSwitches';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import * as catalog from '@/services/catalogService';
import type { ParentSwitches, Quiz } from '@/types';

const state: { switches: ParentSwitches } = { switches: { ...SWITCHES_OFF } };
vi.mock('@/hooks/useSwitches', async (original) => ({
  ...(await original<typeof import('@/hooks/useSwitches')>()),
  useSwitches: () => ({ switches: state.switches, level: null }),
}));
vi.mock('@/services/catalogService');
vi.mock('@/lib/sentry', () => ({ reportError: vi.fn() }));

const quiz = (slug: string, area: Quiz['area'], level: Quiz['level']): Quiz =>
  ({ slug, id: slug, title: slug, area, level }) as unknown as Quiz;

beforeEach(() => {
  state.switches = { ...SWITCHES_OFF };
});

describe('Public boards switch', () => {
  it('hides the leaderboards tab until it is on', () => {
    expect(visibleNav(NAV_ITEMS, SWITCHES_OFF).some((i) => i.to === '/leaderboards')).toBe(false);
    expect(
      visibleNav(NAV_ITEMS, { ...SWITCHES_OFF, public_boards: true }).some(
        (i) => i.to === '/leaderboards',
      ),
    ).toBe(true);
  });

  it('shows three tabs when off and four when on', () => {
    const { unmount } = render(
      <MemoryRouter>
        <TabBar />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
    unmount();
    state.switches = { ...SWITCHES_OFF, public_boards: true };
    render(
      <MemoryRouter>
        <TabBar />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });
});

describe('Trivia and grown-up sets switch', () => {
  const all = [
    quiz('spelling', 'literacy', 'explorers'),
    quiz('film-trivia', 'trivia', 'explorers'),
    quiz('adult-science', 'science', 'adult'),
  ];
  beforeEach(() => {
    vi.mocked(catalog.listCategories).mockResolvedValue([]);
    vi.mocked(catalog.listCurriculumTags).mockResolvedValue([]);
    vi.mocked(catalog.listQuizzes).mockResolvedValue(all);
  });

  it('keeps trivia and adult quizzes out of the lists while it is off', async () => {
    const { result } = renderHook(() => useQuizCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quizzes.map((q) => q.slug)).toEqual(['spelling']);
  });

  it('lists them when the parent turns it on', async () => {
    state.switches = { ...SWITCHES_OFF, trivia_sets: true };
    const { result } = renderHook(() => useQuizCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quizzes.map((q) => q.slug)).toEqual([
      'spelling',
      'film-trivia',
      'adult-science',
    ]);
  });
});
