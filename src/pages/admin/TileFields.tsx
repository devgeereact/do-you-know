import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  freshAssign,
  freshBuild,
  gapFields,
  gapSpec,
  orderSpec,
  spellFields,
  spellSpec,
  splitList,
  type GapFields,
  type SpellFields,
} from '@/lib/tileAuthoring';
import type { AssignSpec, BuildSpec } from '@/services/adminService';
import { inputClass, linkButtonClass, selectClass } from '@/pages/admin/studio';
import { Field } from '@/pages/admin/ui';

const roundButton =
  'grid h-9 w-9 place-items-center rounded-full border-2 border-surface-border text-content-muted hover:border-wrong/40 hover:text-wrong disabled:opacity-40';

interface BuildFieldsProps {
  build: BuildSpec;
  errors: string[];
  onChange: (build: BuildSpec) => void;
}

/**
 * Write a spelling, fill-the-gap or put-in-order question as plain text. What is typed becomes the exact
 * tiles and right answers the server stores (src/lib/tileAuthoring.ts). Keyboard fields are for adults
 * only: the child taps tiles.
 */
export function BuildFields({ build, errors, onChange }: BuildFieldsProps): JSX.Element {
  return (
    <div className="grid gap-3">
      <Field label="Kind of question" htmlFor="ed-build-variant">
        <select
          id="ed-build-variant"
          className={selectClass}
          value={build.variant}
          onChange={(e) => onChange(freshBuild(e.target.value as BuildSpec['variant']))}
        >
          <option value="spell">Spell a word</option>
          <option value="gap">Fill the gaps in a sentence</option>
          <option value="order">Put cards in order</option>
        </select>
      </Field>
      {/* Remounts when the kind changes, so the text boxes start from the new kind's own fields. */}
      {build.variant === 'spell' && (
        <SpellForm key="spell" fields={spellFields(build)} onChange={onChange} errors={errors} />
      )}
      {build.variant === 'gap' && (
        <GapForm key="gap" fields={gapFields(build)} onChange={onChange} errors={errors} />
      )}
      {build.variant === 'order' && (
        <OrderForm key="order" cards={build.answers[0] ?? []} onChange={onChange} errors={errors} />
      )}
    </div>
  );
}

function SpellForm({
  fields,
  errors,
  onChange,
}: {
  fields: SpellFields;
  errors: string[];
  onChange: (b: BuildSpec) => void;
}): JSX.Element {
  const [raw, setRaw] = useState(fields);
  const set = (next: SpellFields): void => {
    setRaw(next);
    onChange(spellSpec(next.word, next.extra, next.speak));
  };
  return (
    <>
      <Field label="Word to spell" htmlFor="ed-spell-word" hint="up to 12 letters" errors={errors}>
        <input
          id="ed-spell-word"
          className={cn(inputClass, errors.length > 0 && 'border-wrong')}
          value={raw.word}
          maxLength={12}
          autoComplete="off"
          onChange={(e) => set({ ...raw, word: e.target.value })}
        />
      </Field>
      <Field label="Extra letters" htmlFor="ed-spell-extra" hint="optional, they make it harder">
        <input
          id="ed-spell-extra"
          className={inputClass}
          value={raw.extra}
          maxLength={8}
          autoComplete="off"
          onChange={(e) => set({ ...raw, extra: e.target.value })}
        />
      </Field>
      <label className="flex items-start gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 accent-primary"
          checked={raw.speak}
          onChange={(e) => set({ ...raw, speak: e.target.checked })}
        />
        <span>
          Read the word aloud (dictation). Practice only: dictation is never used in ranked rounds
          or the daily challenge, and a device with no English voice cannot play it.
        </span>
      </label>
    </>
  );
}

function GapForm({
  fields,
  errors,
  onChange,
}: {
  fields: GapFields;
  errors: string[];
  onChange: (b: BuildSpec) => void;
}): JSX.Element {
  const [raw, setRaw] = useState(fields);
  const set = (next: GapFields): void => {
    setRaw(next);
    onChange(
      gapSpec(
        next.template,
        splitList(next.answer),
        splitList(next.extra),
        next.also.map(splitList),
      ),
    );
  };
  return (
    <>
      <Field
        label="Sentence"
        htmlFor="ed-gap-template"
        hint="write ___ where each word goes"
        errors={errors}
      >
        <input
          id="ed-gap-template"
          className={cn(inputClass, errors.length > 0 && 'border-wrong')}
          value={raw.template}
          maxLength={200}
          autoComplete="off"
          onChange={(e) => set({ ...raw, template: e.target.value })}
        />
      </Field>
      <Field label="Right words, in order" htmlFor="ed-gap-answer" hint="separate with commas">
        <input
          id="ed-gap-answer"
          className={inputClass}
          value={raw.answer}
          autoComplete="off"
          onChange={(e) => set({ ...raw, answer: e.target.value })}
        />
      </Field>
      <Field
        label="Extra words that look possible"
        htmlFor="ed-gap-extra"
        hint="optional, separate with commas"
      >
        <input
          id="ed-gap-extra"
          className={inputClass}
          value={raw.extra}
          autoComplete="off"
          onChange={(e) => set({ ...raw, extra: e.target.value })}
        />
      </Field>
      <Field label="Other right answers" hint="optional, up to 3">
        <div className="grid gap-1.5">
          {raw.also.map((line, k) => (
            <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <input
                className={inputClass}
                value={line}
                aria-label={`Other right answer ${k + 1}`}
                autoComplete="off"
                onChange={(e) =>
                  set({ ...raw, also: raw.also.map((a, j) => (j === k ? e.target.value : a)) })
                }
              />
              <button
                type="button"
                className={roundButton}
                aria-label={`Remove other right answer ${k + 1}`}
                onClick={() => set({ ...raw, also: raw.also.filter((_, j) => j !== k) })}
              >
                ✕
              </button>
            </div>
          ))}
          {raw.also.length < 3 && (
            <button
              type="button"
              className={`${linkButtonClass} justify-self-start`}
              onClick={() => set({ ...raw, also: [...raw.also, ''] })}
            >
              + Add another right answer
            </button>
          )}
        </div>
      </Field>
    </>
  );
}

function OrderForm({
  cards,
  errors,
  onChange,
}: {
  cards: string[];
  errors: string[];
  onChange: (b: BuildSpec) => void;
}): JSX.Element {
  const list = cards.length ? cards : ['', ''];
  const set = (next: string[]): void => onChange(orderSpec(next));
  return (
    <Field label="Cards in the right order (2 to 12)" errors={errors}>
      <div className="grid gap-1.5">
        {list.map((card, k) => (
          <div key={k} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <span className="w-5 text-right text-sm font-bold text-content-muted">{k + 1}</span>
            <input
              className={inputClass}
              value={card}
              maxLength={24}
              aria-label={`Card ${k + 1}`}
              autoComplete="off"
              onChange={(e) => set(list.map((c, j) => (j === k ? e.target.value : c)))}
            />
            <button
              type="button"
              className={roundButton}
              aria-label={`Remove card ${k + 1}`}
              disabled={list.length <= 2}
              onClick={() => set(list.filter((_, j) => j !== k))}
            >
              ✕
            </button>
          </div>
        ))}
        {list.length < 12 && (
          <button
            type="button"
            className={`${linkButtonClass} justify-self-start`}
            onClick={() => set([...list, ''])}
          >
            + Add a card
          </button>
        )}
      </div>
    </Field>
  );
}

interface AssignFieldsProps {
  assign: AssignSpec;
  errors: string[];
  onChange: (assign: AssignSpec) => void;
}

/** Write a match-pairs or sort-into-groups question. Each thing names the place it belongs. */
export function AssignFields({ assign, errors, onChange }: AssignFieldsProps): JSX.Element {
  const match = assign.variant === 'match';
  return (
    <div className="grid gap-3">
      <Field label="Kind of question" htmlFor="ed-assign-variant">
        <select
          id="ed-assign-variant"
          className={selectClass}
          value={assign.variant}
          onChange={(e) => onChange(freshAssign(e.target.value as AssignSpec['variant']))}
        >
          <option value="match">Match pairs</option>
          <option value="sort">Sort into groups</option>
        </select>
      </Field>
      {match ? (
        <MatchRows assign={assign} errors={errors} onChange={onChange} />
      ) : (
        <SortRows assign={assign} errors={errors} onChange={onChange} />
      )}
    </div>
  );
}

function MatchRows({ assign, errors, onChange }: AssignFieldsProps): JSX.Element {
  // Row k pairs items[k] with targets[k].
  const rows = assign.items.map((item, k) => ({
    thing: item.label,
    partner: assign.targets[k] ?? '',
  }));
  const set = (next: { thing: string; partner: string }[]): void =>
    onChange({
      variant: 'match',
      targets: next.map((r) => r.partner),
      items: next.map((r) => ({ label: r.thing, to: r.partner })),
    });
  return (
    <Field label="Pairs · a thing and its partner (2 to 5)" errors={errors}>
      <div className="grid gap-1.5">
        {rows.map((row, k) => (
          <div
            key={k}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2"
          >
            <input
              className={inputClass}
              value={row.thing}
              maxLength={24}
              aria-label={`Thing ${k + 1}`}
              autoComplete="off"
              onChange={(e) =>
                set(rows.map((r, j) => (j === k ? { ...r, thing: e.target.value } : r)))
              }
            />
            <input
              className={inputClass}
              value={row.partner}
              maxLength={24}
              aria-label={`Partner ${k + 1}`}
              autoComplete="off"
              onChange={(e) =>
                set(rows.map((r, j) => (j === k ? { ...r, partner: e.target.value } : r)))
              }
            />
            <button
              type="button"
              className={roundButton}
              aria-label={`Remove pair ${k + 1}`}
              disabled={rows.length <= 2}
              onClick={() => set(rows.filter((_, j) => j !== k))}
            >
              ✕
            </button>
          </div>
        ))}
        {rows.length < 5 && (
          <button
            type="button"
            className={`${linkButtonClass} justify-self-start`}
            onClick={() => set([...rows, { thing: '', partner: '' }])}
          >
            + Add a pair
          </button>
        )}
      </div>
    </Field>
  );
}

function SortRows({ assign, errors, onChange }: AssignFieldsProps): JSX.Element {
  const rename = (k: number, name: string): void => {
    const old = assign.targets[k] ?? '';
    onChange({
      ...assign,
      targets: assign.targets.map((t, j) => (j === k ? name : t)),
      items: assign.items.map((i) => (i.to === old ? { ...i, to: name } : i)),
    });
  };
  const removeGroup = (k: number): void => {
    const gone = assign.targets[k] ?? '';
    const rest = assign.targets.filter((_, j) => j !== k);
    onChange({
      ...assign,
      targets: rest,
      items: assign.items.map((i) => (i.to === gone ? { ...i, to: rest[0] ?? '' } : i)),
    });
  };
  const setItem = (k: number, change: Partial<{ label: string; to: string }>): void =>
    onChange({
      ...assign,
      items: assign.items.map((i, j) => (j === k ? { ...i, ...change } : i)),
    });
  return (
    <>
      <Field label="Groups (2 or 3)" errors={errors}>
        <div className="grid gap-1.5">
          {assign.targets.map((name, k) => (
            <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <input
                className={inputClass}
                value={name}
                maxLength={24}
                aria-label={`Group ${k + 1}`}
                autoComplete="off"
                onChange={(e) => rename(k, e.target.value)}
              />
              <button
                type="button"
                className={roundButton}
                aria-label={`Remove group ${k + 1}`}
                disabled={assign.targets.length <= 2}
                onClick={() => removeGroup(k)}
              >
                ✕
              </button>
            </div>
          ))}
          {assign.targets.length < 3 && (
            <button
              type="button"
              className={`${linkButtonClass} justify-self-start`}
              onClick={() => onChange({ ...assign, targets: [...assign.targets, ''] })}
            >
              + Add a group
            </button>
          )}
        </div>
      </Field>
      <Field label="Things to sort (3 to 6) · pick each one's group">
        <div className="grid gap-1.5">
          {assign.items.map((item, k) => (
            <div
              key={k}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2"
            >
              <input
                className={inputClass}
                value={item.label}
                maxLength={24}
                aria-label={`Thing ${k + 1}`}
                autoComplete="off"
                onChange={(e) => setItem(k, { label: e.target.value })}
              />
              <select
                className={selectClass}
                value={item.to}
                aria-label={`Group for thing ${k + 1}`}
                onChange={(e) => setItem(k, { to: e.target.value })}
              >
                {!assign.targets.includes(item.to) && (
                  <option value={item.to}>{item.to || '—'}</option>
                )}
                {assign.targets.map((t, j) => (
                  <option key={j} value={t}>
                    {t || '—'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={roundButton}
                aria-label={`Remove thing ${k + 1}`}
                disabled={assign.items.length <= 3}
                onClick={() =>
                  onChange({ ...assign, items: assign.items.filter((_, j) => j !== k) })
                }
              >
                ✕
              </button>
            </div>
          ))}
          {assign.items.length < 6 && (
            <button
              type="button"
              className={`${linkButtonClass} justify-self-start`}
              onClick={() =>
                onChange({
                  ...assign,
                  items: [...assign.items, { label: '', to: assign.targets[0] ?? '' }],
                })
              }
            >
              + Add a thing
            </button>
          )}
        </div>
      </Field>
    </>
  );
}
