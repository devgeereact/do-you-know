import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AnswerResult, PublicBuild } from '@/types/game';
import { t } from '@/i18n';

interface TileBuildProps {
  build: PublicBuild;
  /** The question, for the group's accessible name. */
  prompt: string;
  /** Changes with every question so the slots start empty again. */
  questionKey: string;
  /** Set once the server has graded the answer. */
  result: AnswerResult | null;
  disabled: boolean;
  /** Tile handles in slot order. The server grades them; nothing here knows the answer. */
  onSubmit: (handles: string[]) => void;
}

/** Tiles shown as a word (letters run together) or a phrase (spaced). */
function joined(variant: PublicBuild['variant'], labels: string[]): string {
  return labels.join(variant === 'spell' ? '' : ' ');
}

/**
 * Spell, fill the gap, or put cards in order, all by tapping: a tile goes into the next empty space, a
 * filled space gives its tile back, Undo takes back the last one, and Check is ready when every space is
 * full. No dragging, no keyboard typing. Targets are 56 px or more.
 */
export function TileBuild({
  build,
  prompt,
  questionKey,
  result,
  disabled,
  onSubmit,
}: TileBuildProps): JSX.Element {
  const { slots, tiles, variant } = build;
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array(slots).fill(null));
  const [history, setHistory] = useState<number[]>([]);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setPlaced(Array(slots).fill(null));
    setHistory([]);
    setAnnouncement('');
  }, [questionKey, slots]);

  const labelOf = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile.label])), [tiles]);
  const used = new Set(placed.filter((id): id is string => id !== null));
  const locked = disabled || result !== null;
  const full = placed.every((id) => id !== null);

  function place(tileId: string): void {
    const at = placed.indexOf(null);
    if (locked || at < 0 || used.has(tileId)) return;
    setPlaced(placed.map((id, i) => (i === at ? tileId : id)));
    setHistory([...history, at]);
    setAnnouncement(t.play.build.placed(labelOf.get(tileId) ?? '', at + 1, slots));
  }

  function takeBack(slot: number): void {
    const id = placed[slot];
    if (locked || id === null || id === undefined) return;
    setPlaced(placed.map((x, i) => (i === slot ? null : x)));
    setHistory(history.filter((h) => h !== slot));
    setAnnouncement(t.play.build.putBack(labelOf.get(id) ?? ''));
  }

  function undo(): void {
    const last = history[history.length - 1];
    if (last !== undefined) takeBack(last);
  }

  const verdict = result === null ? undefined : result.is_correct ? 'right' : 'wrong';

  const slotButton = (i: number): JSX.Element => {
    const id = placed[i] ?? null;
    const label = id === null ? '' : (labelOf.get(id) ?? '');
    return (
      <button
        key={i}
        type="button"
        className="stage-slot"
        data-filled={id !== null}
        data-state={verdict}
        disabled={locked}
        aria-label={
          id === null
            ? t.play.build.slotEmpty(i + 1, slots)
            : t.play.build.slotFilled(i + 1, slots, label)
        }
        onClick={() => takeBack(i)}
      >
        {variant === 'order' && (
          <span aria-hidden="true" className="text-base opacity-70">
            {i + 1}
          </span>
        )}
        <span aria-hidden="true" className={cn(variant === 'gap' && 'min-w-[4ch] text-center')}>
          {label}
        </span>
      </button>
    );
  };

  const slotNodes = Array.from({ length: slots }, (_, i) => slotButton(i));
  let answerArea: JSX.Element;
  if (variant === 'gap' && build.template) {
    const parts = build.template.split('___');
    answerArea = (
      <p className="text-center text-[1.35rem] font-semibold leading-[3.6rem]">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < slots && <span className="mx-1 inline-block align-middle">{slotNodes[i]}</span>}
          </span>
        ))}
      </p>
    );
  } else if (variant === 'order') {
    answerArea = <div className="flex w-full flex-col items-stretch gap-2">{slotNodes}</div>;
  } else {
    answerArea = <div className="flex flex-wrap justify-center gap-2">{slotNodes}</div>;
  }

  return (
    <div className="flex w-full max-w-160 flex-col items-center gap-4" data-q-build>
      <div role="group" aria-label={`${t.play.build.yourAnswer}: ${prompt}`} className="w-full">
        {answerArea}
      </div>

      <ul aria-label={t.play.build.tiles} className="flex flex-wrap justify-center gap-2">
        {tiles.map((tile) => (
          <li key={tile.id}>
            <button
              type="button"
              className="stage-tile"
              disabled={locked || used.has(tile.id)}
              onClick={() => place(tile.id)}
            >
              {tile.label}
            </button>
          </li>
        ))}
      </ul>

      {result === null ? (
        <div className="flex w-full flex-wrap justify-center gap-3">
          <button
            type="button"
            className="stage-key min-w-28 text-lg"
            disabled={locked || history.length === 0}
            onClick={undo}
          >
            {t.play.build.undo}
          </button>
          <button
            type="button"
            className="h-14 min-w-36 flex-1 rounded-full bg-(--fd) px-7 font-display text-lg font-extrabold text-white shadow-[0_4px_0_rgb(0_0_0/0.25)] transition-transform active:translate-y-[3px] disabled:opacity-50"
            disabled={locked || !full}
            aria-describedby={full ? undefined : `${questionKey}-hint`}
            onClick={() => onSubmit(placed as string[])}
          >
            {t.play.build.check}
          </button>
          {!full && (
            <span id={`${questionKey}-hint`} className="sr-only">
              {t.play.build.fillAll}
            </span>
          )}
        </div>
      ) : (
        !result.is_correct &&
        result.correct_tiles && (
          <p className="text-center font-semibold">
            {t.play.build.answerIs} <strong>{joined(variant, result.correct_tiles)}</strong>
          </p>
        )
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
