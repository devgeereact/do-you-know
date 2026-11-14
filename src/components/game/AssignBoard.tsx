import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AnswerResult, PublicAssign } from '@/types/game';
import { t } from '@/i18n';

interface AssignBoardProps {
  assign: PublicAssign;
  /** The question, for the board's accessible name. */
  prompt: string;
  /** Changes with every question so the board starts empty again. */
  questionKey: string;
  /** Set once the server has graded the answer. */
  result: AnswerResult | null;
  disabled: boolean;
  /** [item handle, target handle] for every item. The server grades them; nothing here knows the key. */
  onSubmit: (pairs: [string, string][]) => void;
}

/**
 * Match pairs or sort into groups, all by tapping: tap a thing to pick it up, then tap where it goes.
 * A placed thing goes back to the tray when it is tapped. Check is ready when everything is placed.
 * No dragging, no keyboard typing. Targets are 56 px or more.
 */
export function AssignBoard({
  assign,
  prompt,
  questionKey,
  result,
  disabled,
  onSubmit,
}: AssignBoardProps): JSX.Element {
  const { items, targets, variant } = assign;
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setPlaced({});
    setPicked(null);
    setAnnouncement('');
  }, [questionKey]);

  const itemLabel = useMemo(() => new Map(items.map((i) => [i.id, i.label])), [items]);
  const targetLabel = useMemo(() => new Map(targets.map((x) => [x.id, x.label])), [targets]);
  const locked = disabled || result !== null;
  const all = items.every((i) => placed[i.id] !== undefined);
  const trayItems = items.filter((i) => placed[i.id] === undefined);

  // After grading: is this item where the server says it belongs?
  const rightTarget = useMemo(
    () => new Map((result?.correct_pairs ?? []).map(([item, to]) => [item, to])),
    [result],
  );
  const stateOf = (itemId: string): 'right' | 'wrong' | undefined => {
    if (result === null || !result.correct_pairs) return undefined;
    const want = rightTarget.get(itemLabel.get(itemId) ?? '');
    return want === targetLabel.get(placed[itemId] ?? '') ? 'right' : 'wrong';
  };

  function pick(id: string): void {
    if (locked) return;
    const next = picked === id ? null : id;
    setPicked(next);
    setAnnouncement(
      next === null
        ? t.play.assign.unpick(itemLabel.get(id) ?? '')
        : t.play.assign.pick(itemLabel.get(id) ?? ''),
    );
  }

  function send(targetId: string): void {
    if (locked || picked === null) return;
    setPlaced({ ...placed, [picked]: targetId });
    setAnnouncement(
      t.play.assign.placed(itemLabel.get(picked) ?? '', targetLabel.get(targetId) ?? ''),
    );
    setPicked(null);
  }

  function takeBack(itemId: string): void {
    if (locked) return;
    const rest = { ...placed };
    delete rest[itemId];
    setPlaced(rest);
    setAnnouncement(t.play.assign.putBack(itemLabel.get(itemId) ?? ''));
  }

  const wrong = result !== null && !result.is_correct && result.correct_pairs;

  return (
    <div className="flex w-full max-w-160 flex-col items-center gap-4" data-q-assign>
      <ul aria-label={t.play.assign.items} className="flex min-h-14 flex-wrap justify-center gap-2">
        {trayItems.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              className="stage-tile"
              aria-pressed={picked === i.id}
              disabled={locked}
              onClick={() => pick(i.id)}
            >
              {i.label}
            </button>
          </li>
        ))}
      </ul>

      <ul
        aria-label={`${t.play.assign.targets}: ${prompt}`}
        className={cn(
          'grid w-full grid-cols-[minmax(0,1fr)] gap-3',
          targets.length > 2 && 'sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]',
        )}
      >
        {targets.map((x) => {
          const inside = items.filter((i) => placed[i.id] === x.id);
          const full = variant === 'match' && inside.length > 0;
          return (
            <li key={x.id} className="stage-zone flex flex-col gap-2 rounded-2xl p-2">
              <button
                type="button"
                className="stage-key w-full text-lg"
                aria-label={t.play.assign.sendTo(x.label)}
                data-ready={picked !== null && !full}
                disabled={locked || full}
                onClick={() => send(x.id)}
              >
                {x.label}
              </button>
              <ul aria-label={x.label} className="flex min-h-14 flex-wrap justify-center gap-2">
                {inside.map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      className="stage-slot"
                      data-filled="true"
                      data-state={stateOf(i.id)}
                      disabled={locked}
                      aria-label={t.play.assign.takeBack(i.label, x.label)}
                      onClick={() => takeBack(i.id)}
                    >
                      <span aria-hidden="true">{i.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {result === null ? (
        <div className="flex w-full flex-wrap justify-center gap-3">
          <button
            type="button"
            className="h-14 min-w-36 flex-1 rounded-full bg-(--fd) px-7 font-display text-lg font-extrabold text-white shadow-[0_4px_0_rgb(0_0_0/0.25)] transition-transform active:translate-y-[3px] disabled:opacity-50"
            disabled={locked || !all}
            aria-describedby={all ? undefined : `${questionKey}-hint`}
            onClick={() => onSubmit(items.map((i): [string, string] => [i.id, placed[i.id] ?? '']))}
          >
            {t.play.assign.check}
          </button>
          {!all && (
            <span id={`${questionKey}-hint`} className="sr-only">
              {t.play.assign.placeAll}
            </span>
          )}
        </div>
      ) : (
        wrong && (
          <p className="text-center font-semibold">
            {t.play.assign.answerIs}{' '}
            <strong>
              {(result.correct_pairs ?? []).map(([a, b]) => `${a} → ${b}`).join('; ')}
            </strong>
          </p>
        )
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
