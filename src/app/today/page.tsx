import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { TaskCard } from "@/components/TaskCard";
import { TaskCardSlot } from "@/components/TaskCardSlot";
import { EmptyState } from "@/components/EmptyState";
import { MONTH_LABELS_GENITIVE, WEEKDAY_LABELS, today as getToday } from "@/lib/dates";
import { rolloverOverdueTasks } from "@/lib/rollover";
import { getVisitorId } from "@/lib/visitor";

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;

export default async function TodayPage() {
  const date = getToday();
  const ownerId = await getVisitorId();
  if (ownerId) await rolloverOverdueTasks(ownerId);

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-6 sm:py-10">
      <h1 className="text-lg font-semibold text-accent-today transition-colors duration-300">
        Сьогодні · {label}
      </h1>

      {sorted.length === 0 ? (
        <EmptyState message="Сьогодні задач немає — гарний день, щоб додати нові.">
          <Link href="/" className="text-sm font-medium text-accent hover:underline">
            Додати задачу
          </Link>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((task) => (
            <TaskCardSlot key={task.id} taskId={task.id}>
              <TaskCard task={task} />
            </TaskCardSlot>
          ))}
        </ul>
      )}
    </div>
  );
}
