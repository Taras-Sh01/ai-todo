// "Today" as a UTC-midnight-stamped Date carrying the *local* calendar day
// (read via local getters, then re-stamped in UTC) so it compares cleanly
// against `date`-mode columns, which always round-trip through UTC.
export function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// Weeks start on Monday throughout this app (ISO-style), independent of locale.
export function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const WEEKDAY_LABELS = [
  "неділя",
  "понеділок",
  "вівторок",
  "середа",
  "четвер",
  "п'ятниця",
  "субота",
];

// Resolves a recurring/unanchored weekday name (e.g. from a phrase like
// "щопонеділка" with no calendar date attached) to the nearest date on or
// after `from` that falls on that weekday — `from` itself if it already
// matches. Kept deterministic/off the LLM for the same predictability
// reason the rest of scheduling is (see src/lib/schedule.ts).
export function nextOrTodayWeekday(from: Date, weekdayLabel: string): Date {
  const targetIndex = WEEKDAY_LABELS.indexOf(weekdayLabel);
  if (targetIndex === -1) return from;
  const diff = (targetIndex - from.getUTCDay() + 7) % 7;
  return addDays(from, diff);
}

export const MONTH_LABELS_GENITIVE = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];
