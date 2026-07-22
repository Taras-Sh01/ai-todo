import Link from "next/link";
import { and, eq, gte, or } from "drizzle-orm";
import { db } from "@/db";
import { tasks, type Task } from "@/db/schema";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import {
  MONTH_LABELS_GENITIVE,
  WEEKDAY_LABELS,
  addDays,
  formatISODate,
  isSameDate,
  startOfWeek,
  today as getToday,
} from "@/lib/dates";
import { rolloverOverdueTasks } from "@/lib/rollover";
import { getVisitorId } from "@/lib/visitor";

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;
const UNSCHEDULED_KEY = "unscheduled";

function dayGroupLabel(date: Date, today: Date): string {
  const dayMonth = `${date.getUTCDate()} ${MONTH_LABELS_GENITIVE[date.getUTCMonth()]}`;
  if (isSameDate(date, today)) return `Сьогодні, ${dayMonth}`;
  if (isSameDate(date, addDays(today, 1))) return `Завтра, ${dayMonth}`;
  const weekday = WEEKDAY_LABELS[date.getUTCDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`;
}

// "Цей тиждень" / "Наступний тиждень" while still nearby, then a Mon–Sun
// date range once it's far enough out that "week N" would be meaningless.
function weekGroupLabel(weekStart: Date, thisWeekStart: Date): string {
  if (isSameDate(weekStart, thisWeekStart)) return "Цей тиждень";
  if (isSameDate(weekStart, addDays(thisWeekStart, 7))) return "Наступний тиждень";

  const weekEnd = addDays(weekStart, 6);
  const startMonth = MONTH_LABELS_GENITIVE[weekStart.getUTCMonth()];
  const endMonth = MONTH_LABELS_GENITIVE[weekEnd.getUTCMonth()];

  return startMonth === endMonth
    ? `${weekStart.getUTCDate()}–${weekEnd.getUTCDate()} ${endMonth}`
    : `${weekStart.getUTCDate()} ${startMonth} – ${weekEnd.getUTCDate()} ${endMonth}`;
}

export default async function UpcomingPage() {
  const today = getToday();
  const thisWeekStart = startOfWeek(today);
  const ownerId = await getVisitorId();
  if (ownerId) await rolloverOverdueTasks(ownerId);

  // Everything not yet done, plus anything (done or not) scheduled today or
  // later — so finished history doesn't pile up here forever. Nothing stays
  // overdue by this point: rolloverOverdueTasks already bumped any
  // incomplete past-dated task onto today above.
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

  // Bucket by day first...
  const dayGroups = new Map<string, Task[]>();
  for (const t of sorted) {
    const key = t.scheduledDate ? formatISODate(t.scheduledDate) : UNSCHEDULED_KEY;
    if (!dayGroups.has(key)) dayGroups.set(key, []);
    dayGroups.get(key)!.push(t);
  }

  const dayKeys = [...dayGroups.keys()].sort((a, b) => {
    if (a === UNSCHEDULED_KEY) return 1;
    if (b === UNSCHEDULED_KEY) return -1;
    return a.localeCompare(b);
  });

  // ...then nest day buckets under their week, so the page reads as
  // "this week / next week / ..." instead of one long flat run of days.
  // Iterating dayKeys in ascending order means `weeks` comes out sorted too.
  type WeekGroup = { weekStart: Date; dayKeys: string[] };
  const weeks: WeekGroup[] = [];
  const weekByKey = new Map<string, WeekGroup>();

  for (const key of dayKeys) {
    if (key === UNSCHEDULED_KEY) continue;
    const weekStart = startOfWeek(new Date(`${key}T00:00:00.000Z`));
    const weekKey = formatISODate(weekStart);
    let group = weekByKey.get(weekKey);
    if (!group) {
      group = { weekStart, dayKeys: [] };
      weekByKey.set(weekKey, group);
      weeks.push(group);
    }
    group.dayKeys.push(key);
  }

  const unscheduled = dayGroups.get(UNSCHEDULED_KEY);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-6 sm:py-10">
      <h1 className="text-lg font-semibold text-accent-upcoming transition-colors duration-300">Найближчі</h1>

      {weeks.length === 0 && !unscheduled ? (
        <EmptyState message="Немає запланованих задач.">
          <Link href="/" className="text-sm font-medium text-accent hover:underline">
            Додати задачу
          </Link>
        </EmptyState>
      ) : (
        <>
          {weeks.map(({ weekStart, dayKeys: keysInWeek }) => (
            <section key={formatISODate(weekStart)} className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {weekGroupLabel(weekStart, thisWeekStart)}
              </h2>
              {keysInWeek.map((key) => (
                <div key={key} className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {dayGroupLabel(new Date(`${key}T00:00:00.000Z`), today)}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {dayGroups.get(key)!.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}

          {unscheduled && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Без конкретної дати
              </h2>
              <ul className="flex flex-col gap-2">
                {unscheduled.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
