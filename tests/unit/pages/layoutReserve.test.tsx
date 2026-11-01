import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CategoryPage } from '@/pages/CategoryPage';
import { carryOnRow } from '@/lib/carryOn';

// While the catalogue loads, the category page must hold the banner's space, so the age
// chips and quiz list do not jump down when it arrives (CLS 0.26 measured on live).
vi.mock('@/hooks/useQuizCatalog', () => ({
  useQuizCatalog: () => ({
    categories: [],
    quizzes: [],
    curriculumTags: [],
    loading: true,
    error: null,
    refresh: async () => {},
  }),
}));

describe('layout space reserved while data loads', () => {
  it('category page keeps the banner height before the category arrives', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/c/science']}>
        <Routes>
          <Route path="/c/:slug" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const holder = container.querySelector('[data-reserve="banner"]');
    expect(holder).not.toBeNull();
    expect(holder?.className).toContain('min-h-[9.5rem]');
    expect(holder?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-reserve="description"]')).not.toBeNull();
    expect(container.querySelector('[role="status"]')?.className).toContain('min-h-[60vh]');
  });

  it('phone home keeps the "Carry on" row while trending quizzes load', () => {
    expect(carryOnRow(0, 0, true)).toBe('placeholder');
    expect(carryOnRow(0, 3, false)).toBe('show');
    expect(carryOnRow(2, 0, false)).toBe('show');
    expect(carryOnRow(0, 0, false)).toBe('hide');
  });
});
