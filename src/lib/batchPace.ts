import { addDays } from '@/lib/london';

/** Quizzes made live per day when a batch is published; 0 means all at once. */
export const PACES: readonly { value: number; label: string }[] = [
  { value: 0, label: 'All now' },
  { value: 10, label: '10 a day' },
  { value: 5, label: '5 a day' },
  { value: 3, label: '3 a day' },
  { value: 1, label: '1 a day' },
];

/** How many days a paced publish takes (the first is today) and the date the last quiz goes live. */
export function paceFinish(
  ready: number,
  perDay: number,
  today: string,
): { days: number; last: string } {
  if (ready <= 0) return { days: 0, last: today };
  const days = perDay <= 0 ? 1 : Math.ceil(ready / perDay);
  return { days, last: addDays(today, days - 1) };
}

/** "Fri 20 Nov" for a YYYY-MM-DD date. */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
