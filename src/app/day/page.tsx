import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { TaskCard } from "@/components/TaskCard";
import { addDays, formatISODate, today as getToday } from "@/lib/dates";
import { getVisitorId } from "@/lib/visitor";

const WEEKDAY_LABELS = [
  "неділя",
  "понеділок",
  "вівторок",
  "середа",
  "четвер",
  "п'ятниця",
  "субота",
];

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;

export default async function DayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date
    ? new Date(`${params.date}T00:00:00.000Z`)
    : getToday();

  const ownerId = await getVisitorId();
  const dayTasks = ownerId
    ? await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.scheduledDate, date), eq(tasks.ownerId, ownerId)))
    : [];

  const sorted = [...dayTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority !== b.priority) {
      return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    }
    return a.title.localeCompare(b.title);
  });

  const prevDate = formatISODate(addDays(date, -1));
  const nextDate = formatISODate(addDays(date, 1));
  const label = `${WEEKDAY_LABELS[date.getUTCDay()]}, ${date.getUTCDate()}.${
    date.getUTCMonth() + 1
  }.${date.getUTCFullYear()}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link
          href={`/day?date=${prevDate}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Попередній день
        </Link>
        <h1 className="text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-50">
          {label}
        </h1>
        <Link
          href={`/day?date=${nextDate}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Наступний день →
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Немає задач на цей день.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  );
}
