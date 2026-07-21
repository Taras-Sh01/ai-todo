import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { TaskCard } from "@/components/TaskCard";
import { MONTH_LABELS_GENITIVE, WEEKDAY_LABELS, today as getToday } from "@/lib/dates";
import { getVisitorId } from "@/lib/visitor";

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;

export default async function TodayPage() {
  const date = getToday();
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

  const label = `${WEEKDAY_LABELS[date.getUTCDay()]}, ${date.getUTCDate()} ${
    MONTH_LABELS_GENITIVE[date.getUTCMonth()]
  }`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-10">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Сьогодні · {label}
      </h1>

      {sorted.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Немає задач на сьогодні.
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
