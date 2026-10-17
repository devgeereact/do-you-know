import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressDots } from '@/components/game/ProgressDots';

describe('ProgressDots', () => {
  it('announces the position in words', () => {
    render(<ProgressDots position={3} total={10} />);
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
  });

  it('draws one decorative dot per question and hides them from screen readers', () => {
    const { container } = render(<ProgressDots position={2} total={5} />);
    const list = container.querySelector('ol');
    expect(list).toHaveAttribute('aria-hidden', 'true');
    expect(list?.querySelectorAll('li')).toHaveLength(5);
  });

  it('marks earlier dots done, the current one active and later ones pending', () => {
    const { container } = render(<ProgressDots position={3} total={5} />);
    const dots = [...container.querySelectorAll('li')];
    expect(dots.map((d) => (d.className.includes('bg-primary') ? 'done' : ''))).toEqual([
      'done',
      'done',
      '',
      '',
      '',
    ]);
    expect(dots[2]?.className).toContain('bg-secondary');
    expect(dots[2]?.className).toContain('w-4');
    expect(dots[3]?.className).toContain('bg-surface-border');
  });

  it('handles the first and last question', () => {
    const { container, rerender } = render(<ProgressDots position={1} total={3} />);
    expect(container.querySelectorAll('li.bg-primary')).toHaveLength(0);
    rerender(<ProgressDots position={3} total={3} />);
    expect(container.querySelectorAll('li.bg-primary')).toHaveLength(2);
  });
});
