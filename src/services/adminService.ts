import { api } from '@/lib/api';

/**
 * Staff calls. Every one carries a Clerk session token and is checked again on the server
 * against the private admin allowlist; nothing here decides who is an admin.
 */
export type GetToken = () => Promise<string | null>;

async function adminCall<T>(getToken: GetToken, path: string, body?: unknown): Promise<T> {
  const authToken = await getToken();
  if (!authToken) throw new Error('not_signed_in');
  return api<T>(path, { authToken, ...(body === undefined ? {} : { body }) });
}

export interface AuditEntry {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  at: string;
}

/** Resolves when the signed-in account is an admin; rejects with ApiError 403 otherwise. */
export function getAdminMe(getToken: GetToken): Promise<{ is_admin: true }> {
  return adminCall(getToken, '/admin/me');
}

export function getAuditLog(getToken: GetToken): Promise<AuditEntry[]> {
  return adminCall(getToken, '/admin/audit');
}
