import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { AdminConsole } from '@/pages/admin/AdminConsole';

const service = vi.hoisted(() => ({ getAdminMe: vi.fn(), getAuditLog: vi.fn() }));
vi.mock('@/services/adminService', () => service);

const getToken = (): Promise<string | null> => Promise.resolve('token');

describe('AdminConsole', () => {
  beforeEach(() => {
    service.getAdminMe.mockReset();
    service.getAuditLog.mockReset();
  });

  it('shows a refusal, and no admin content, when the server says 403', async () => {
    service.getAdminMe.mockRejectedValue(new ApiError('forbidden', 403));
    render(<AdminConsole getToken={getToken} account={<span>account</span>} />);
    expect(await screen.findByText('This account cannot use the admin area')).toBeInTheDocument();
    expect(screen.queryByText('Recent changes')).not.toBeInTheDocument();
    expect(service.getAuditLog).not.toHaveBeenCalled();
  });

  it('shows the shell and the audit log once the server allows the account', async () => {
    service.getAdminMe.mockResolvedValue({ is_admin: true });
    service.getAuditLog.mockResolvedValue([
      {
        id: 1,
        action: 'test.write',
        target_type: 'fixture',
        target_id: 'x1',
        detail: null,
        at: '2026-10-27T10:00:00Z',
      },
    ]);
    render(<AdminConsole getToken={getToken} account={<span>account</span>} />);
    expect(await screen.findByText('Recent changes')).toBeInTheDocument();
    expect(screen.getByText('test.write')).toBeInTheDocument();
    expect(service.getAdminMe).toHaveBeenCalledTimes(1);
  });

  it('reports a load problem for other errors without calling the account forbidden', async () => {
    service.getAdminMe.mockRejectedValue(new ApiError('network_error', 0));
    render(<AdminConsole getToken={getToken} account={null} />);
    expect(await screen.findByText('The admin area could not load')).toBeInTheDocument();
  });
});
