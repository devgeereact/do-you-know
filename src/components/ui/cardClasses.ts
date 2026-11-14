/**
 * Interactive surfaces (quiz cards, subject tiles, resume rows): one border, radius, hover
 * lift and focus ring, so every clickable card on every page behaves the same way.
 * Transform, border and shadow only; the press settles back down.
 */
export const cardLinkClass =
  'rounded-2xl border border-surface-border bg-surface shadow-soft transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift active:translate-y-0 active:shadow-none focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Filter chips (age groups and similar): a pill that fills with primary when chosen. */
export function chipClass(active: boolean): string {
  return [
    'inline-flex min-h-tap items-center rounded-full border-2 px-4 font-semibold transition-[transform,background-color,border-color,color] duration-120 ease-out hover:-translate-y-0.5 active:translate-y-0',
    'focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    active
      ? 'border-primary bg-primary text-primary-fg'
      : 'border-surface-border bg-surface text-content hover:border-primary/40',
  ].join(' ');
}

/** Small "see all" style link beside a section heading. */
export const sectionLinkClass =
  'inline-flex min-h-tap shrink-0 items-center gap-1 rounded-full px-2 text-sm font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-primary';
