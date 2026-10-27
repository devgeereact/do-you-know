import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/api';
import { getAdminMe, getAuditLog, type AuditEntry, type GetToken } from '@/services/adminService';

type Access = 'checking' | 'allowed' | 'forbidden' | 'error';

const SECTIONS = [
  { name: 'Overview', ready: true },
  { name: 'Dashboard', ready: false },
  { name: 'Moderation', ready: false },
  { name: 'Quizzes', ready: false },
  { name: 'Daily challenge', ready: false },
  { name: 'Growth tools', ready: false },
  { name: 'Generator', ready: false },
] as const;

/** The signed-in staff shell. Shows nothing but a refusal unless the server says this account is an admin. */
export function AdminConsole({
  getToken,
  account,
}: {
  getToken: GetToken;
  account: ReactNode;
}): JSX.Element {
  const [access, setAccess] = useState<Access>('checking');
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  // Callers pass a fresh function each render; the check must run once per mount.
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;

  useEffect(() => {
    let active = true;
    const read: GetToken = () => tokenRef.current();
    getAdminMe(read)
      .then(() => getAuditLog(read))
      .then((rows) => {
        if (!active) return;
        setAudit(rows);
        setAccess('allowed');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAccess(
          err instanceof ApiError && (err.status === 403 || err.status === 401)
            ? 'forbidden'
            : 'error',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  if (access === 'checking') return <p role="status">Checking access…</p>;
  if (access !== 'allowed') {
    return (
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold">
          {access === 'forbidden'
            ? 'This account cannot use the admin area'
            : 'The admin area could not load'}
        </h1>
        <p className="text-content-muted">
          {access === 'forbidden'
            ? 'Sign in with the site owner account.'
            : 'Try again in a moment.'}
        </p>
        {account}
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <nav aria-label="Admin sections" className="space-y-1">
        {SECTIONS.map((s) => (
          <p
            key={s.name}
            aria-current={s.ready ? 'page' : undefined}
            className={s.ready ? 'font-semibold text-content' : 'text-content-muted'}
          >
            {s.name}
            {!s.ready && <span className="ml-2 text-xs">soon</span>}
          </p>
        ))}
        <div className="pt-4">{account}</div>
      </nav>
      <main className="space-y-6">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <Card>
          <h2 className="text-xl font-semibold">Recent changes</h2>
          {audit.length === 0 ? (
            <p className="mt-2 text-content-muted">No admin changes yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-surface-border">
              {audit.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <span className="font-semibold">{a.action}</span>
                  {a.target_type && (
                    <span className="text-content-muted">
                      {' '}
                      · {a.target_type} {a.target_id}
                    </span>
                  )}
                  <span className="block text-content-muted">
                    {new Date(a.at).toLocaleString('en-GB')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
