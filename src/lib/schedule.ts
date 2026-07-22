import { addDays, formatISODate, nextOrTodayWeekday, startOfWeek, today as getToday } from "./dates";
import type { ParsedTask } from "./parsed-task";

export const WEEKDAY_CAPACITY_MINUTES = 6 * 60;
export const DEFAULT_ESTIMATE_MINUTES = 30;

// Safety valve for pathological inputs (e.g. dozens of tasks with no
// deadline) — never search further ahead than this many days.
export const MAX_LOOKAHEAD_DAYS = 30;

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

// Places every task that has no explicit day (scheduledDate === null) onto a
// real weekday, respecting existing load (already-saved tasks, and tasks
// placed earlier in this same batch) and deadlines. Tasks that already carry
// an explicit day — the user named it in their own text — are left exactly
// as they are, even if that day happens to be a weekend: an explicit human
// statement always outranks the weekends-are-off default.
//
// `existingLoadMinutes` maps an ISO date string to minutes already booked on
// that day from the visitor's other incomplete tasks.
export function scheduleTasks(
  parsedTasks: ParsedTask[],
  existingLoadMinutes: Map<string, number>,
): ParsedTask[] {
  const today = getToday();

  // Resolve recurring/unanchored weekday mentions (e.g. "щопонеділка") to a
  // real date before anything else — deterministically, not via the LLM's
  // own date arithmetic, for the same predictability reason the rest of
  // this function stays off the LLM. Once resolved, these behave exactly
  // like any other explicit scheduledDate below (fixed placement, no
  // capacity gating): the named weekday outranks load-balancing.
  const resolved = parsedTasks.map((t) => {
    if (t.scheduledDate || !t.impliedWeekday) return t;
    const date = nextOrTodayWeekday(today, t.impliedWeekday);
    return {
      ...t,
      scheduledDate: formatISODate(date),
      scheduledWeekStart: formatISODate(startOfWeek(date)),
    };
  });

  const load = new Map(existingLoadMinutes);

  function remainingCapacity(date: Date): number {
    if (isWeekend(date)) return 0;
    const key = formatISODate(date);
    return WEEKDAY_CAPACITY_MINUTES - (load.get(key) ?? 0);
  }

  function addLoad(date: Date, minutes: number) {
    const key = formatISODate(date);
    load.set(key, (load.get(key) ?? 0) + minutes);
  }

  const fixed: ParsedTask[] = [];
  const needsPlacement: ParsedTask[] = [];

  for (const t of resolved) {
    if (t.scheduledDate) {
      fixed.push(t);
      addLoad(new Date(`${t.scheduledDate}T00:00:00.000Z`), t.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES);
    } else {
      needsPlacement.push(t);
    }
  }

  // Earliest deadline first, then priority — never volume/order of typing.
  const sorted = [...needsPlacement].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });

  const placed = sorted.map((t) => {
    const minutes = t.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES;
    const deadline = t.dueDate ? new Date(`${t.dueDate}T00:00:00.000Z`) : null;

    let placedDate: Date | null = null;
    for (let i = 0; i < MAX_LOOKAHEAD_DAYS; i++) {
      const day = addDays(today, i);
      if (deadline && day.getTime() > deadline.getTime()) break;
      if (remainingCapacity(day) >= minutes) {
        placedDate = day;
        break;
      }
    }

    // Didn't fit anywhere before the deadline (or within the lookahead with
    // no deadline) — a deadline still wins over capacity; fall back to it.
    const finalDate = placedDate ?? deadline ?? addDays(today, MAX_LOOKAHEAD_DAYS - 1);
    addLoad(finalDate, minutes);

    return {
      ...t,
      scheduledDate: formatISODate(finalDate),
      scheduledWeekStart: formatISODate(startOfWeek(finalDate)),
    };
  });

  return [...fixed, ...placed];
}
