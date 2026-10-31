import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { AdminConsole } from '@/pages/admin/AdminConsole';

const service = vi.hoisted(() => ({
  getAdminMe: vi.fn(),
  client: {
    subjects: vi.fn(),
    todo: vi.fn(),
    quizzes: vi.fn(),
    stats: vi.fn(),
    daily: vi.fn(),
  },
}));
vi.mock('@/services/adminService', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/services/adminService')>();
  return { ...real, getAdminMe: service.getAdminMe, adminClient: () => service.client };
});

const getToken = (): Promise<string | null> => Promise.resolve('token');

function renderConsole(account: JSX.Element | null = <span>account</span>): void {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminConsole getToken={getToken} account={account} />
    </MemoryRouter>,
  );
}

describe('AdminConsole', () => {
  beforeEach(() => {
    service.getAdminMe.mockReset();
    service.client.subjects.mockResolvedValue([]);
    service.client.todo.mockResolvedValue([
      { key: 'feedback_new', count: 2, label: '2 new feedback messages' },
      { key: 'daily_gaps', count: 5, label: '5 days' },
    ]);
    service.client.quizzes.mockResolvedValue([]);
    service.client.stats.mockResolvedValue({
      plays: { today: 3, d7: 10, d30: 40 },
      finish_rate_7d: 80,
      new_guests_7d: 4,
      modes_7d: { practice: 0, ranked: 5, daily: 5, challenge: 0 },
      top_quizzes_7d: [],
      hardest: [],
    });
    service.client.daily.mockResolvedValue({ month: '2026-10', today: '2026-10-31', days: [] });
  });

  it('shows a refusal, and no Studio, when the server says 403', async () => {
    service.getAdminMe.mockRejectedValue(new ApiError('forbidden', 403));
    renderConsole();
    expect(await screen.findByText('This account can’t use the Studio')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Studio' })).not.toBeInTheDocument();
    expect(service.client.todo).not.toHaveBeenCalled();
  });

  it('shows the Studio shell with nav counts once the server allows the account', async () => {
    service.getAdminMe.mockResolvedValue({ is_admin: true });
    renderConsole();
    const nav = await screen.findByRole('navigation', { name: 'Studio' });
    expect(nav).toHaveTextContent('Do You Know?Studio');
    expect(nav).toHaveTextContent('Work');
    expect(await screen.findByText('New messages in the inbox')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inbox/ })).toHaveTextContent('2');
    expect(service.getAdminMe).toHaveBeenCalledTimes(1);
  });

  it('opens the search palette with Ctrl+K and lists the screens', async () => {
    service.getAdminMe.mockResolvedValue({ is_admin: true });
    renderConsole();
    await screen.findByRole('navigation', { name: 'Studio' });
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: 'Search the Studio' });
    expect(within(dialog).getByRole('option', { name: /Daily calendar/ })).toBeInTheDocument();
    fireEvent.keyDown(within(dialog).getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Search the Studio' })).not.toBeInTheDocument();
  });

  it('reports a load problem for other errors without calling the account forbidden', async () => {
    service.getAdminMe.mockRejectedValue(new ApiError('network_error', 0));
    renderConsole(null);
    expect(await screen.findByText('The Studio could not load')).toBeInTheDocument();
  });
});
