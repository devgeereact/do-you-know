import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrownUpsPage } from '@/pages/GrownUpsPage';
import * as api from '@/lib/api';
import * as account from '@/services/accountService';
import * as parent from '@/services/parentService';

const auth = {
  isLoaded: true,
  isSignedIn: true,
  getToken: vi.fn(() => Promise.resolve('clerk-token')),
};
const signOut = vi.fn(() => Promise.resolve());
vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => auth,
  useClerk: () => ({ signOut }),
}));
vi.mock('@/lib/env', () => ({ env: { clerkPublishableKey: 'pk_test_x', apiUrl: '/api/v1' } }));
vi.mock('@/hooks/useDocumentMeta', () => ({ useDocumentMeta: vi.fn() }));
vi.mock('@/services/accountService');
vi.mock('@/services/parentService');
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  adoptGuestToken: vi.fn(),
  clearSession: vi.fn(),
}));

const kid = {
  id: 'c1',
  nickname: 'BraveOtter42',
  avatar_id: 'fox',
  level: 'starters' as const,
  created_at: 'x',
};
const view = (): void => {
  render(
    <MemoryRouter>
      <GrownUpsPage />
    </MemoryRouter>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.isSignedIn = true;
  vi.mocked(account.linkAdultSession).mockResolvedValue({
    profile_id: 'p',
    linked_game_history: false,
  });
  vi.mocked(parent.confirmGrownUp).mockResolvedValue();
  vi.mocked(parent.listChildren).mockResolvedValue([kid]);
  vi.mocked(parent.getChildSkills).mockResolvedValue({
    child: kid,
    areas: [],
    stickers: [],
    sticker_book: [],
    next_area: 'literacy',
  } as never);
  vi.mocked(parent.getSwitches).mockResolvedValue({
    public_boards: false,
    challenge_friend: false,
    beat_clock: false,
    slider_questions: false,
    trivia_sets: false,
    sound: false,
    easy_read: false,
  });
});

describe('GrownUpsPage', () => {
  it('asks a signed-out visitor to sign in and shows nothing about any child', () => {
    auth.isSignedIn = false;
    view();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('BraveOtter42')).not.toBeInTheDocument();
    expect(parent.listChildren).not.toHaveBeenCalled();
  });

  it('links the grown-up sign-in first, then shows the children', async () => {
    view();
    expect(await screen.findByRole('heading', { name: 'BraveOtter42' })).toBeInTheDocument();
    expect(account.linkAdultSession).toHaveBeenCalled();
    expect(parent.confirmGrownUp).toHaveBeenCalled();
  });

  it('has three tabs and moves between them', async () => {
    const user = userEvent.setup();
    view();
    await screen.findByRole('heading', { name: 'BraveOtter42' });
    await user.click(screen.getByRole('button', { name: 'Switches' }));
    expect(await screen.findAllByRole('switch')).toHaveLength(7);
    await user.click(screen.getByRole('button', { name: 'Contact' }));
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
  });

  it("hands over: the child's session is adopted and the parent is signed out", async () => {
    const user = userEvent.setup();
    vi.mocked(parent.handOver).mockResolvedValue({
      token: 'guest_abc',
      expires_at: 'soon',
      child: kid,
    });
    view();
    await screen.findByRole('heading', { name: 'BraveOtter42' });
    await user.click(screen.getByRole('button', { name: 'Hand over' }));
    await user.click(screen.getByRole('button', { name: 'Hand over and sign out' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/' }));
    expect(api.adoptGuestToken).toHaveBeenCalledWith({ token: 'guest_abc', expires_at: 'soon' });
    // The child's session is installed before the parent's ends.
    expect(vi.mocked(api.adoptGuestToken).mock.invocationCallOrder[0]).toBeLessThan(
      signOut.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('does not leave the device half handed over when the sign-out fails', async () => {
    const user = userEvent.setup();
    vi.mocked(parent.handOver).mockResolvedValue({
      token: 'guest_abc',
      expires_at: 'soon',
      child: kid,
    });
    signOut.mockRejectedValueOnce(new Error('network'));
    view();
    await screen.findByRole('heading', { name: 'BraveOtter42' });
    await user.click(screen.getByRole('button', { name: 'Hand over' }));
    await user.click(screen.getByRole('button', { name: 'Hand over and sign out' }));
    await waitFor(() => expect(api.clearSession).toHaveBeenCalled());
    expect(await screen.findByText(/did not work/i)).toBeInTheDocument();
  });
});
