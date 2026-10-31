import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { WorldGlyph } from '@/components/art/Art';
import { WORLD_KEYS, isWorld, type WorldKey } from '@/lib/art';
import { world } from '@/lib/worlds';
import {
  adminErrorMessage,
  type Subject,
  type SubjectKind,
  type SubjectPatch,
} from '@/services/adminService';
import { inputClass, selectClass, useStudio } from '@/pages/admin/studio';
import { AHead, Panel, Pill, Table, Td, Tr } from '@/pages/admin/ui';

/** Subjects: name, kind, world, on/off and order. */
export function SubjectsScreen(): JSX.Element {
  const { client, subjects, refreshSubjects, toast, confirm } = useStudio();
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<SubjectKind>('school');
  const [newWorld, setNewWorld] = useState<WorldKey | ''>('');
  const rows = [...subjects].sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    refreshSubjects().catch(() => undefined);
  }, [refreshSubjects]);

  const update = async (s: Subject, patch: SubjectPatch, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      await client.updateSubject(s.slug, patch);
      await refreshSubjects();
      toast(success);
      return true;
    } catch (err) {
      toast(adminErrorMessage(err), 'bad');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const rename = async (s: Subject): Promise<void> => {
    const name = (names[s.slug] ?? s.name).trim();
    if (name === s.name) return;
    const ok = await confirm({
      title: `Rename “${s.name}”?`,
      body: `It becomes “${name}” everywhere on the site straight away.`,
      confirmLabel: 'Rename',
    });
    const clear = (): void =>
      setNames((n) => {
        const next = { ...n };
        delete next[s.slug];
        return next;
      });
    if (!ok || (await update(s, { name }, 'Subject renamed'))) clear();
  };

  const move = async (i: number, by: -1 | 1): Promise<void> => {
    const a = rows[i];
    const b = rows[i + by];
    if (!a || !b) return;
    setBusy(true);
    try {
      // Equal orders cannot swap, so spread them out by position first.
      const orderA = a.sort_order === b.sort_order ? (i + by) * 10 : b.sort_order;
      const orderB = a.sort_order === b.sort_order ? i * 10 : a.sort_order;
      await client.updateSubject(a.slug, { sort_order: orderA });
      await client.updateSubject(b.slug, { sort_order: orderB });
      await refreshSubjects();
      toast('Order saved');
    } catch (err) {
      toast(adminErrorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  };

  const add = async (): Promise<void> => {
    if (newName.trim().length < 2) {
      toast('Give the subject a name (2 characters or more).', 'bad');
      return;
    }
    setBusy(true);
    try {
      await client.createSubject({ name: newName.trim(), kind: newKind, scene: newWorld || null });
      await refreshSubjects();
      setNewName('');
      toast('Subject added');
    } catch (err) {
      toast(adminErrorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AHead
        title="Subjects"
        lead="One subject per quiz. Key stage is set on each quiz. A subject shows on the site once it has a live quiz and is switched on."
      />
      <Table
        className="mb-4"
        label="Subjects"
        head={[
          { label: 'Subject' },
          { label: 'Type' },
          { label: 'World' },
          { label: 'Live quizzes', num: true },
          { label: 'On the site' },
          { label: 'Order' },
        ]}
      >
        {rows.map((s, i) => {
          const shown = s.is_active && s.live_quizzes > 0;
          return (
            <Tr key={s.slug}>
              <Td label="Subject" lead>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    {isWorld(s.scene) ? (
                      <WorldGlyph world={s.scene} size={16} />
                    ) : (
                      <span className="font-display font-extrabold">{s.name.charAt(0)}</span>
                    )}
                  </span>
                  <input
                    className={`${inputClass} h-8 max-w-[220px] py-0`}
                    aria-label={`Name for ${s.name}`}
                    value={names[s.slug] ?? s.name}
                    maxLength={160}
                    onChange={(e) => setNames((n) => ({ ...n, [s.slug]: e.target.value }))}
                    onBlur={() => void rename(s)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      // Without this the same key press would also press the confirm button.
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }}
                  />
                </span>
              </Td>
              <Td label="Type">
                <select
                  aria-label={`Type for ${s.name}`}
                  className={`${selectClass} h-8 w-auto`}
                  value={s.kind}
                  disabled={busy}
                  onChange={(e) =>
                    void update(s, { kind: e.target.value as SubjectKind }, 'Type saved')
                  }
                >
                  <option value="general">Topic</option>
                  <option value="school">School</option>
                </select>
              </Td>
              <Td label="World">
                <select
                  aria-label={`World for ${s.name}`}
                  className={`${selectClass} h-8 w-auto`}
                  value={s.scene ?? ''}
                  disabled={busy}
                  onChange={(e) =>
                    void update(
                      s,
                      { scene: isWorld(e.target.value) ? e.target.value : null },
                      'World saved',
                    )
                  }
                >
                  <option value="">Auto</option>
                  {WORLD_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {world(k).name}
                    </option>
                  ))}
                </select>
              </Td>
              <Td label="Live quizzes" num>
                {s.live_quizzes}
              </Td>
              <Td label="On the site">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#6C4CF5]"
                    checked={s.is_active}
                    disabled={busy}
                    aria-label={`${s.name} on the site`}
                    onChange={async () => {
                      const ok = await confirm({
                        title: s.is_active ? `Switch off “${s.name}”?` : `Switch on “${s.name}”?`,
                        body: s.is_active
                          ? 'It disappears from the site. Its quizzes stay as they are.'
                          : 'It shows on the site once it has a live quiz.',
                        confirmLabel: s.is_active ? 'Switch off' : 'Switch on',
                        tone: s.is_active ? 'danger' : 'primary',
                      });
                      if (ok) {
                        await update(
                          s,
                          { is_active: !s.is_active },
                          s.is_active ? 'Switched off' : 'Switched on',
                        );
                      }
                    }}
                  />
                  <Pill tone={shown ? 'ok' : 'mute'}>
                    {shown ? 'Showing' : s.is_active ? 'Waiting for a live quiz' : 'Switched off'}
                  </Pill>
                </label>
              </Td>
              <Td label="Order">
                <span className="inline-flex gap-1">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full border-2 border-surface-border font-bold disabled:opacity-40"
                    aria-label={`Move ${s.name} up`}
                    disabled={busy || i === 0}
                    onClick={() => void move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full border-2 border-surface-border font-bold disabled:opacity-40"
                    aria-label={`Move ${s.name} down`}
                    disabled={busy || i === rows.length - 1}
                    onClick={() => void move(i, 1)}
                  >
                    ↓
                  </button>
                </span>
              </Td>
            </Tr>
          );
        })}
      </Table>
      <Panel
        as="form"
        className="flex flex-wrap items-end gap-2 !p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <b className="w-full text-sm sm:w-auto sm:self-center">Add a subject</b>
        <label htmlFor="ns-name" className="sr-only">
          Name
        </label>
        <input
          id="ns-name"
          className={`${inputClass} h-10 max-w-[240px] flex-[1_1_180px] py-0`}
          placeholder="e.g. Design & Technology"
          value={newName}
          maxLength={160}
          onChange={(e) => setNewName(e.target.value)}
        />
        <label htmlFor="ns-kind" className="sr-only">
          Type
        </label>
        <select
          id="ns-kind"
          className={`${selectClass} w-auto`}
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as SubjectKind)}
        >
          <option value="school">School</option>
          <option value="general">Topic</option>
        </select>
        <label htmlFor="ns-world" className="sr-only">
          World
        </label>
        <select
          id="ns-world"
          className={`${selectClass} w-auto`}
          value={newWorld}
          onChange={(e) => setNewWorld(isWorld(e.target.value) ? e.target.value : '')}
        >
          <option value="">World: auto</option>
          {WORLD_KEYS.map((k) => (
            <option key={k} value={k}>
              {world(k).name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={busy}>
          Add subject
        </Button>
      </Panel>
    </>
  );
}
