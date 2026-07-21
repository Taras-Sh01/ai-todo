import { and, eq, gte, or } from "drizzle-orm";
import { db } from "@/db";
import { tasks, type Task } from "@/db/schema";
import { TaskCard } from "@/components/TaskCard";
import {
  MONTH_LABELS_GENITIVE,
  WEEKDAY_LABELS,
  addDays,
  formatISODate,
  isSameDate,
  today as getToday,
} from "@/lib/dates";
import { getVisitorId } from "@/lib/visitor";

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;
const UNSCHEDULED_KEY = "unscheduled";
const OVERDUE_KEY = "overdue";

function dayGroupLabel(date: Date, today: Date): string {
  const dayMonth = `${date.getUTCDate()} ${MONTH_LABELS_GENITIVE[date.getUTCMonth()]}`;
  if (isSameDate(date, today)) return `Сьогодні, ${dayMonth}`;
  if (isSameDate(date, addDays(today, 1))) return `Завтра, ${dayMonth}`;
  const weekday = WEEKDAY_LABELS[date.getUTCDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`;
}

export default async function UpcomingPage() {
  const today = getToday();
  const ownerId = await getVisitorId();

  // Everything not yet done, plus anything (done or not) scheduled today or
  // later — so an overdue incomplete task never just silently disappears,
  // but finished history doesn't pile up here forever either.
  const rows = ownerId
    ? await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.ownerId, ownerId),
            or(eq(tasks.completed, false), gte(tasks.scheduledDate, today)),
          ),
        )
    : [];

  const sorted = [...rows].sort((a, b) => {
    const aTime = a.scheduledDate?.getTime() ?? Infinity;
    const bTime = b.scheduledDate?.getTime() ?? Infinity;
    if (aTime !== bTime) return aTime - bTime;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });

  const groups = new Map<string, Task[]>();
  for (const t of sorted) {
    const key = !t.scheduledDate
      ? UNSCHEDULED_KEY
      : t.scheduledDate.getTime() < today.getTime()
        ? OVERDUE_KEY
        : formatISODate(t.scheduledDate);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  // Overdue always leads, regardless of insertion order.
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === OVERDUE_KEY) return -1;
    if (b === OVERDUE_KEY) return 1;
    if (a === UNSCHEDULED_KEY) return 1;
    if (b === UNSCHEDULED_KEY) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Найближчі</h1>

      {orderedKeys.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Немає запланованих задач.
        </p>
      ) : (
        orderedKeys.map((key) => (
          <section key={key} className="flex flex-col gap-2">
            <h2
              className={`text-sm font-medium ${
                key === OVERDUE_KEY
                  ? "text-red-500 dark:text-red-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {key === OVERDUE_KEY
                ? "Прострочено"
                : key === UNSCHEDULED_KEY
                  ? "Без конкретної дати"
                  : dayGroupLabel(new Date(`${key}T00:00:00.000Z`), today)}
            </h2>
            <ul className="flex flex-col gap-2">
              {groups.get(key)!.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
