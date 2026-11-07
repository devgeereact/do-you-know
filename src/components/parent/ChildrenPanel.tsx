import { useCallback, useEffect, useState } from 'react';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AVATARS } from '@/lib/avatars';
import { LEVELS, levelLabel } from '@/lib/levels';
import { cn } from '@/lib/utils';
import {
  addChild,
  changeChild,
  listChildren,
  removeChild,
  type GetToken,
} from '@/services/parentService';
import type { Child, ChildLevel } from '@/types';
import { t } from '@/i18n';

const copy = t.grownUps.children;
const field =
  'h-12 w-full rounded-xl border-2 border-surface-border bg-surface px-3 text-base focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20';

/** A grid of the preset pictures: choosing one is a tap, never a file or a name. */
function AvatarPicker({
  value,
  onPick,
  label,
}: {
  value: string | null;
  onPick: (id: string) => void;
  label: string;
}): JSX.Element {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {AVATARS.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-pressed={value === a.id}
          aria-label={a.label}
          onClick={() => onPick(a.id)}
          className={cn(
            'grid min-h-tap min-w-tap place-items-center rounded-full border-[3px] p-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary',
            value === a.id ? 'border-primary' : 'border-transparent',
          )}
        >
          <AvatarBadge avatarId={a.id} size="sm" />
        </button>
      ))}
    </div>
  );
}

function LevelSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ChildLevel;
  onChange: (level: ChildLevel) => void;
}): JSX.Element {
  return (
    <select
      id={id}
      className={field}
      value={value}
      onChange={(e) => onChange(e.target.value as ChildLevel)}
    >
      {LEVELS.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name} ({l.years})
        </option>
      ))}
    </select>
  );
}

interface ChildCardProps {
  child: Child;
  busy: boolean;
  onChange: (change: { level?: ChildLevel; avatar_id?: string; new_nickname?: true }) => void;
  onHandOver: () => void;
  onRemove: () => void;
}

function ChildCard({ child, busy, onChange, onHandOver, onRemove }: ChildCardProps): JSX.Element {
  const [confirm, setConfirm] = useState<'hand' | 'remove' | null>(null);
  const levelId = `level-${child.id}`;
  return (
    <Card as="article" className="grid gap-4" aria-label={child.nickname}>
      <div className="flex items-center gap-3">
        <AvatarBadge avatarId={child.avatar_id} nickname={child.nickname} size="md" />
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold">{child.nickname}</h3>
          <p className="text-sm text-content-muted">{levelLabel(child.level)}</p>
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={levelId} className="text-sm font-bold text-content-muted">
          {copy.level}
        </label>
        <LevelSelect id={levelId} value={child.level} onChange={(level) => onChange({ level })} />
        <p className="text-xs text-content-muted">{copy.levelHint}</p>
      </div>

      <div className="grid gap-1.5">
        <span className="text-sm font-bold text-content-muted">{copy.character}</span>
        <AvatarPicker
          label={`${copy.character}: ${child.nickname}`}
          value={child.avatar_id}
          onPick={(avatar_id) => onChange({ avatar_id })}
        />
      </div>

      {confirm === null ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => setConfirm('hand')}>
            {copy.handOver}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onChange({ new_nickname: true })}
          >
            {copy.newName}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setConfirm('remove')}>
            {copy.remove}
          </Button>
        </div>
      ) : (
        <div
          role="alertdialog"
          aria-label={child.nickname}
          className="grid gap-3 rounded-xl bg-surface-muted p-3"
        >
          <p>
            {confirm === 'hand'
              ? copy.handOverBody(child.nickname)
              : copy.removeBody(child.nickname)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() => (confirm === 'hand' ? onHandOver() : onRemove())}
            >
              {confirm === 'hand' ? copy.handOverConfirm : copy.removeConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {copy.cancel}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

interface ChildrenPanelProps {
  getToken: GetToken;
  /** Called with the child to hand the device to; the page signs the parent out afterwards. */
  onHandOver: (child: Child) => Promise<void>;
}

/** Add, change, hand over to and remove children. Everything here is a pick from a list. */
export function ChildrenPanel({ getToken, onHandOver }: ChildrenPanelProps): JSX.Element {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState<ChildLevel>('starters');
  const [newAvatar, setNewAvatar] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setChildren(await listChildren(getToken));
    } catch {
      setMessage(copy.failed);
      setChildren([]);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(work: () => Promise<void>, done?: string): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      await work();
      if (done) setMessage(done);
    } catch {
      setMessage(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  if (children === null) return <p role="status">{t.grownUps.loading}</p>;
  const full = children.length >= 5;

  return (
    <div className="grid gap-4">
      <p role="note" className="text-sm text-content-muted">
        {copy.nameNote}
      </p>
      {message && (
        <p role="status" className="font-semibold">
          {message}
        </p>
      )}
      {children.length === 0 && <p className="text-content-muted">{copy.empty}</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {children.map((child) => (
          <li key={child.id} className="grid">
            <ChildCard
              child={child}
              busy={busy}
              onChange={(change) =>
                void act(async () => {
                  const updated = await changeChild(getToken, child.id, change);
                  setChildren((list) => (list ?? []).map((c) => (c.id === child.id ? updated : c)));
                }, copy.saved)
              }
              onHandOver={() => void act(() => onHandOver(child))}
              onRemove={() =>
                void act(async () => {
                  await removeChild(getToken, child.id);
                  setChildren((list) => (list ?? []).filter((c) => c.id !== child.id));
                })
              }
            />
          </li>
        ))}
      </ul>

      <Card as="section" aria-labelledby="add-child" className="grid gap-4">
        <h3 id="add-child" className="text-xl font-bold">
          {copy.addTitle}
        </h3>
        {full ? (
          <p>{copy.limit}</p>
        ) : (
          <>
            <div className="grid gap-1.5">
              <label htmlFor="new-level" className="text-sm font-bold text-content-muted">
                {copy.level}
              </label>
              <LevelSelect id="new-level" value={newLevel} onChange={setNewLevel} />
              <p className="text-xs text-content-muted">{copy.levelHint}</p>
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-bold text-content-muted">{copy.character}</span>
              <AvatarPicker label={copy.character} value={newAvatar} onPick={setNewAvatar} />
            </div>
            <div>
              <Button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const child = await addChild(getToken, {
                      level: newLevel,
                      ...(newAvatar ? { avatar_id: newAvatar } : {}),
                    });
                    setChildren((list) => [...(list ?? []), child]);
                    setNewAvatar(null);
                  })
                }
              >
                {copy.add}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
