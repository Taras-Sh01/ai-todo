import Link from "next/link";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { tasks, type Task } from "@/db/schema";
import { TaskCard } from "@/components/TaskCard";
import { TaskCardSlot } from "@/components/TaskCardSlot";
import { EmptyState } from "@/components/EmptyState";
import {
  MONTH_LABELS,
  MONTH_LABELS_GENITIVE,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  addDays,
  formatISODate,
  isSameDate,
  shiftMonth,
  startOfWeek,
  today as getToday,
} from "@/lib/dates";
import { rolloverOverdueTasks } from "@/lib/rollover";
import { getVisitorId } from "@/lib/visitor";

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;
const GRID_DAYS = 6 * 7;

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-zinc-300 dark:bg-zinc-600",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

// Mon..Sun display order (WEEKDAY_SHORT_LABELS is Sun-first, matching
// Date#getUTCDay, like WEEKDAY_LABELS).
const WEEKDAY_HEADER = [...WEEKDAY_SHORT_LABELS.slice(1), WEEKDAY_SHORT_LABELS[0]];

function parseIntParam(value: string | string[] | undefined, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) ? n : fallback;
}

function dayHref(date: Date): string {
  return `/calendar?year=${date.getUTCFullYear()}&month=${date.getUTCMonth() + 1}&day=${date.getUTCDate()}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const today = getToday();

  const year = parseIntParam(params.year, today.getUTCFullYear());
  const month = parseIntParam(params.month, today.getUTCMonth() + 1); // 1-12
  const dayParam = parseIntParam(params.day, 0);

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(gridStart, GRID_DAYS - 1);
  const gridDates = Array.from({ length: GRID_DAYS }, (_, i) => addDays(gridStart, i));

  const isCurrentRealMonth = year === today.getUTCFullYear() && month === today.getUTCMonth() + 1;
  const selectedDate =
    dayParam > 0 ? new Date(Date.UTC(year, month - 1, dayParam)) : isCurrentRealMonth ? today : monthStart;

  const ownerId = await getVisitorId();
  if (ownerId) await rolloverOverdueTasks(ownerId);

  const rows = ownerId
    ? await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.ownerId, ownerId),
            isNotNull(tasks.scheduledDate),
            gte(tasks.scheduledDate, gridStart),
            lte(tasks.scheduledDate, gridEnd),
          ),
        )
    : [];

  const byDate = new Map<string, Task[]>();
  for (const t of rows) {
    if (!t.scheduledDate) continue;
    const key = formatISODate(t.scheduledDate);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(t);
  }

  const selectedKey = formatISODate(selectedDate);
  const selectedTasks = [...(byDate.get(selectedKey) ?? [])].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority !== b.priority) return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    return a.title.localeCompare(b.title);
  });

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const prevHref = `/calendar?year=${prev.year}&month=${prev.month}`;
  const nextHref = `/calendar?year=${next.year}&month=${next.month}`;
  const todayHref = dayHref(today);

  const selectedDayLabel = `${WEEKDAY_LABELS[selectedDate.getUTCDay()]}, ${selectedDate.getUTCDate()} ${
    MONTH_LABELS_GENITIVE[selectedDate.getUTCMonth()]
  }`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between">
        <Link
          href={prevHref}
          aria-label="Попередній місяць"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
        >
          ‹
        </Link>
        <h1 className="text-lg font-semibold text-accent-calendar transition-colors duration-300">
          {MONTH_LABELS[month - 1]} {year}
        </h1>
        <Link
          href={nextHref}
          aria-label="Наступний місяць"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
        >
          ›
        </Link>
      </div>

      {!isCurrentRealMonth && (
        <Link href={todayHref} className="-mt-2 self-center text-sm font-medium text-accent hover:underline">
          Сьогодні
        </Link>
      )}

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_HEADER.map((w) => (
          <div key={w} className="text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
            {w}
          </div>
        ))}
        {gridDates.map((date) => {
          const key = formatISODate(date);
          const dayTasks = byDate.get(key) ?? [];
          const inMonth = date.getUTCMonth() === monthStart.getUTCMonth() && date.getUTCFullYear() === monthStart.getUTCFullYear();
          const isToday = isSameDate(date, today);
          const isSelected = isSameDate(date, selectedDate);

          return (
            <Link
              key={key}
              href={dayHref(date)}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors duration-300 ${
                isSelected
                  ? "bg-accent-solid text-white"
                  : isToday
                    ? "font-semibold text-accent-calendar hover:bg-black/5 dark:hover:bg-white/5"
                    : inMonth
                      ? "text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/5"
                      : "text-zinc-300 hover:bg-black/5 dark:text-zinc-700 dark:hover:bg-white/5"
              }`}
            >
              <span>{date.getUTCDate()}</span>
              <span className="flex h-1 gap-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <span
                    key={t.id}
                    className={`h-1 w-1 rounded-full ${isSelected ? "bg-white" : PRIORITY_DOT[t.priority]}`}
                  />
                ))}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{selectedDayLabel}</h2>
        {selectedTasks.length === 0 ? (
          <EmptyState message="На цей день задач немає." />
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedTasks.map((task) => (
              <TaskCardSlot key={task.id} taskId={task.id}>
                <TaskCard task={task} />
              </TaskCardSlot>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
