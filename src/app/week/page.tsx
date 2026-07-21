import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { tasks, type Task } from "@/db/schema";
import { TaskCard } from "@/components/TaskCard";
import { addDays, formatISODate, isSameDate, startOfWeek, today as getToday } from "@/lib/dates";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const weekStart = params.week
    ? startOfWeek(new Date(`${params.week}T00:00:00.000Z`))
    : startOfWeek(getToday());

  const weekTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.scheduledWeekStart, weekStart));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const unscheduled = weekTasks.filter((t) => !t.scheduledDate);

  const prevWeek = formatISODate(addDays(weekStart, -7));
  const nextWeek = formatISODate(addDays(weekStart, 7));

  function tasksForDay(day: Date, all: Task[]) {
    return all.filter((t) => t.scheduledDate && isSameDate(t.scheduledDate, day));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link
          href={`/week?week=${prevWeek}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Попередній тиждень
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Тиждень від {formatISODate(weekStart)}
        </h1>
        <Link
          href={`/week?week=${nextWeek}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Наступний тиждень →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {DAY_LABELS[i]} {day.getUTCDate()}.{day.getUTCMonth() + 1}
            </div>
            <ul className="flex flex-col gap-2">
              {tasksForDay(day, weekTasks).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {unscheduled.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            На цьому тижні, без конкретного дня
          </h2>
          <ul className="flex flex-col gap-2">
            {unscheduled.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
