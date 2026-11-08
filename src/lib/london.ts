/** Today's date in Europe/London as YYYY-MM-DD: the calendar the daily challenge and the Studio run on. */
export function londonToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Adds (or takes away) whole calendar days from a YYYY-MM-DD date, without any clock-change drift. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The London calendar date `days` days before today. Counts calendar days, not 24-hour blocks, so it is right on the days the clocks change. */
export function londonDaysAgo(days: number, now: Date = new Date()): string {
  return addDays(londonToday(now), -days);
}
