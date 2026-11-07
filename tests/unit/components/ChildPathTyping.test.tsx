import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NicknamePicker } from '@/components/game/NicknamePicker';
import { ContactPage } from '@/pages/ContactPage';
import { profile } from '../support/fixtures';
import type { Profile } from '@/types';

// The child path must never offer a keyboard: no age question, no text box, no "I'm 18 or over" tick.
const state = { profile: profile() as Profile | null, isChild: false };
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: state.profile,
    isChild: state.isChild,
    loading: false,
    error: null,
    setAgeBand: vi.fn(),
    shuffleNickname: vi.fn().mockResolvedValue('BraveOtter42'),
    setNickname: vi.fn(),
  }),
}));
vi.mock('@/hooks/useSession', () => ({ useSession: () => ({ ensureSession: vi.fn() }) }));
vi.mock('@/hooks/useQuizCatalog', () => ({ useQuizCatalog: () => ({ quizzes: [] }) }));
vi.mock('@/hooks/useDocumentMeta', () => ({ useDocumentMeta: vi.fn() }));

beforeEach(() => {
  state.profile = profile({ age_band: null, nickname: 'BraveOtter42' });
  state.isChild = false;
});

describe('NicknamePicker for a guest', () => {
  it('asks no age question and offers no text box', () => {
    render(<NicknamePicker />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/how old|age group|13/i)).not.toBeInTheDocument();
    expect(screen.getByText('BraveOtter42')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use this/i })).toBeInTheDocument();
  });

  it('still lets a profile that already holds an adult age band type its own', () => {
    state.profile = profile({ age_band: '18_plus' });
    render(<NicknamePicker />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

describe('ContactPage for a guest', () => {
  const renderContact = (): void => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    );
  };

  it('has no "18 or over" tick and no free-text field', () => {
    renderContact();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
  });

  it('points grown-ups to the contact email instead', () => {
    renderContact();
    expect(screen.getByText(/grown-ups: to write to us, email/i)).toBeInTheDocument();
  });

  it('keeps the grown-up form for a profile that already holds an adult band', () => {
    state.profile = profile({ age_band: '18_plus' });
    renderContact();
    expect(screen.getByRole('button', { name: /i.m a grown-up/i })).toBeInTheDocument();
  });
});
