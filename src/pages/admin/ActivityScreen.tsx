import { useState } from 'react';
import type { AuditEntry } from '@/services/adminService';
import { niceDateTime, selectClass, useLoad, useStudio } from '@/pages/admin/studio';
import { AHead, Empty, ErrorNote, Filters, Loading, Table, Td, Tr } from '@/pages/admin/ui';

const ACTIONS: Record<string, string> = {
  'quiz.create': 'Created a quiz',
  'quiz.save': 'Edited a quiz',
  'quiz.append': 'Added questions',
  'quiz.submit': 'Sent to check',
  'quiz.unsubmit': 'Back to draft',
  'quiz.check': 'Checked a question',
  'quiz.publish': 'Published',
  'quiz.retire': 'Retired a quiz',
  'quiz.restore': 'Restored a quiz',
  'quiz.discard': 'Discarded edits',
  'daily.set': 'Set a daily',
  'daily.clear': 'Cleared a daily',
  'round.hide': 'Hid a round',
  'round.show': 'Restored a round',
  'subject.create': 'Added a subject',
  'subject.update': 'Changed a subject',
  'feedback.reply': 'Replied to feedback',
  'feedback.note': 'Added a note',
  'feedback.status': 'Changed feedback status',
};

function describe(a: AuditEntry): string {
  const bits: string[] = [];
  if (a.target_type) bits.push(`${a.target_type} ${a.target_id ?? ''}`.trim());
  if (a.detail) {
    const d = Object.entries(a.detail)
      .filter(([, v]) => v !== null && typeof v !== 'object')
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
      .slice(0, 3);
    if (d.length) bits.push(d.join(', '));
  }
  return bits.join(' · ') || '–';
}

/** The read-only audit trail of Studio changes. */
export function ActivityScreen(): JSX.Element {
  const { client } = useStudio();
  const [action, setAction] = useState('');
  const list = useLoad(() => client.audit(), []);
  const actions = [...new Set((list.data ?? []).map((a) => a.action))].sort();
  const rows = (list.data ?? []).filter((a) => !action || a.action === action);
  return (
    <>
      <AHead
        title="Activity"
        lead="Every change made in the Studio, newest first (last 50). This list can’t be edited."
      />
      <Filters>
        <label htmlFor="act-f" className="sr-only">
          Action
        </label>
        <select
          id="act-f"
          className={`${selectClass} h-9 w-auto`}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTIONS[a] ?? a}
            </option>
          ))}
        </select>
      </Filters>
      {list.error ? (
        <ErrorNote message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : (
        <Table label="Activity" head={[{ label: 'When' }, { label: 'Action' }, { label: 'What' }]}>
          {rows.map((a) => (
            <Tr key={a.id}>
              <Td label="When" className="whitespace-nowrap text-content-muted">
                {niceDateTime(a.at)}
              </Td>
              <Td label="Action">
                <span className="inline-flex flex-wrap items-center justify-end gap-1.5 min-[720px]:justify-start">
                  <b>{ACTIONS[a.action] ?? a.action}</b>
                  <code className="rounded-full bg-content/[0.06] px-2 py-0.5 text-[11px] text-content-muted">
                    {a.action}
                  </code>
                </span>
              </Td>
              <Td label="What" className="break-all text-content-muted">
                {describe(a)}
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && (
            <tr className="max-[719px]:block">
              <td colSpan={3} className="max-[719px]:block">
                <Empty>No changes yet.</Empty>
              </td>
            </tr>
          )}
        </Table>
      )}
    </>
  );
}
