import { useEffect, useState } from 'react';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Button } from '@/components/ui/Button';
import type { RoundItem } from '@/services/adminService';
import {
  fmtMs,
  inputClass,
  niceDateTime,
  useAction,
  useLoad,
  useStudio,
} from '@/pages/admin/studio';
import {
  AHead,
  Empty,
  ErrorNote,
  Filters,
  Loading,
  Pill,
  SegList,
  Table,
  Td,
  Tr,
} from '@/pages/admin/ui';

const MODE: Record<string, string> = {
  ranked: 'Ranked',
  daily: 'Daily',
  challenge: 'Challenge',
  practice: 'Practice',
};

/** Ranked and daily rounds; hiding one takes it off every public board. */
export function PlayersScreen(): JSX.Element {
  const { client, confirm } = useStudio();
  const { busy, run } = useAction();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [hiddenOnly, setHiddenOnly] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(text.trim()), 300);
    return () => window.clearTimeout(t);
  }, [text]);
  const list = useLoad(
    () => client.rounds({ q: query || undefined, hidden: hiddenOnly ? true : undefined }),
    [query, hiddenOnly],
  );
  const hiddenCount = useLoad(() => client.rounds({ hidden: true, limit: 200 }), []);

  const toggle = async (r: RoundItem): Promise<void> => {
    const ok = await confirm(
      r.hidden
        ? {
            title: `Show ${r.nickname ?? 'this player'}’s round again?`,
            body: 'It goes back on the public boards straight away.',
            confirmLabel: 'Restore round',
          }
        : {
            title: `Hide ${r.nickname ?? 'this player'}’s round?`,
            body: 'It comes off every public board straight away. Nothing is deleted; you can restore it.',
            confirmLabel: 'Hide round',
            tone: 'danger',
          },
    );
    if (!ok) return;
    const res = await run(
      () => client.hideRound(r.id, !r.hidden),
      r.hidden ? 'Round restored' : 'Round hidden',
    );
    if (res) {
      list.setData(
        (list.data ?? [])
          .map((x) => (x.id === r.id ? { ...x, hidden: res.hidden } : x))
          .filter((x) => !hiddenOnly || x.hidden),
      );
      hiddenCount.reload();
    }
  };

  return (
    <>
      <AHead
        title="Players"
        lead="Every ranked and daily round. Hiding a round takes it off every public board straight away. Nothing is deleted, and there’s no personal data to show."
      />
      <Filters>
        <label htmlFor="pl-q" className="sr-only">
          Search nicknames
        </label>
        <input
          id="pl-q"
          className={`${inputClass} h-9 max-w-[280px] flex-[1_1_180px] py-0`}
          placeholder="Search nicknames"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <SegList<'all' | 'hidden'>
          label="Show"
          value={hiddenOnly ? 'hidden' : 'all'}
          onChange={(v) => setHiddenOnly(v === 'hidden')}
          options={[
            { value: 'all', label: 'All' },
            { value: 'hidden', label: 'Hidden', count: hiddenCount.data?.length ?? 0 },
          ]}
        />
      </Filters>
      {list.error ? (
        <ErrorNote message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : (
        <Table
          label="Rounds"
          head={[
            { label: 'Player' },
            { label: 'Quiz' },
            { label: 'Mode' },
            { label: 'Score', num: true },
            { label: 'Time', num: true },
            { label: 'When' },
            { label: '' },
          ]}
        >
          {list.data.map((r) => (
            <Tr key={r.id} className={r.hidden ? 'opacity-60' : undefined}>
              <Td label="Player" lead>
                <span className="flex min-w-0 items-center gap-2">
                  <AvatarBadge avatarId={r.avatar_id} nickname={r.nickname} size="xs" />
                  <b className="truncate">{r.nickname ?? 'Player'}</b>
                  {r.hidden && <Pill tone="bad">Hidden</Pill>}
                </span>
              </Td>
              <Td label="Quiz">{r.quiz_title}</Td>
              <Td label="Mode">{MODE[r.mode] ?? r.mode}</Td>
              <Td label="Score" num>
                {r.correct}/{r.total}
              </Td>
              <Td label="Time" num>
                {fmtMs(r.ms)}
              </Td>
              <Td label="When" className="whitespace-nowrap text-content-muted">
                {niceDateTime(r.finished_at)}
              </Td>
              <Td label="">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  disabled={busy}
                  onClick={() => void toggle(r)}
                >
                  {r.hidden ? 'Restore…' : 'Hide…'}
                </Button>
              </Td>
            </Tr>
          ))}
          {list.data.length === 0 && (
            <tr className="max-[719px]:block">
              <td colSpan={7} className="max-[719px]:block">
                <Empty>No rounds match.</Empty>
              </td>
            </tr>
          )}
        </Table>
      )}
    </>
  );
}
