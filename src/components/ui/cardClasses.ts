/**
 * Interactive surfaces (quiz cards, subject tiles, resume rows): one border, radius, hover
 * lift and focus ring, so every clickable card on every page behaves the same way.
 * Transform, border and shadow only; the press settles back down.
 */
export const cardLinkClass =
  'rounded-2xl border border-surface-border bg-surface shadow-soft transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Filter chips (age groups and similar): a pill that fills with primary when chosen. */
export function chipClass(active: boolean): string {
  return [
    'inline-flex min-h-tap items-center rounded-full border-2 px-4 font-semibold transition-[transform,background-color,border-color,color] duration-[120ms] ease-out hover:-translate-y-0.5 active:translate-y-0',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    active
      ? 'border-primary bg-primary text-primary-fg'
      : 'border-surface-border bg-surface text-content hover:border-primary/40',
  ].join(' ');
}

/** Small "see all" style link beside a section heading. */
export const sectionLinkClass =
  'inline-flex min-h-tap shrink-0 items-center gap-1 rounded-full px-2 text-sm font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary';

/**
 * Card lists that always end on a full row. Cards wrap in a flex row at a set number of
 * columns per breakpoint, and any cards left on the last row widen to share its width, so
 * a grid of four never ends with three cards and a gap. The 1px keeps rounding from
 * pushing a card onto the next line. Put `list` on the `<ul>` and `item` on each `<li>`.
 */
export const fullRows = {
  /** Quiz cards: one column, two from small tablets, three on desktop. */
  quizzes: {
    list: 'flex flex-wrap gap-4',
    item: 'min-w-0 grow basis-full sm:basis-[calc((100%-1rem)/2-1px)] lg:basis-[calc((100%-2rem)/3-1px)]',
  },
  /** Subject tiles: two columns, three from small tablets, four on desktop. */
  tiles: {
    list: 'flex flex-wrap gap-3',
    item: 'min-w-0 grow basis-[calc((100%-0.75rem)/2-1px)] sm:basis-[calc((100%-1.5rem)/3-1px)] lg:basis-[calc((100%-2.25rem)/4-1px)]',
  },
  /** Resume rows: one column, two from small tablets. */
  pairs: {
    list: 'flex flex-wrap gap-3',
    item: 'min-w-0 grow basis-full sm:basis-[calc((100%-0.75rem)/2-1px)]',
  },
} as const;
