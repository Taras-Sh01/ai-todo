import type { Task } from "@/db/schema";
import { deleteTask, moveToDate, toggleComplete, updateTask } from "@/app/actions";
import { addDays, formatISODate, today } from "@/lib/dates";

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Низький",
  medium: "Середній",
  high: "Високий",
};

// Left-edge accent bar, not a dot — scannable at a glance in a long list.
const PRIORITY_BORDER: Record<Task["priority"], string> = {
  low: "border-l-zinc-300 dark:border-l-zinc-700",
  medium: "border-l-amber-500",
  high: "border-l-red-500",
};

const fieldClass =
  "rounded-lg border border-zinc-300 bg-white px-2 py-2 text-base dark:border-zinc-700 dark:bg-zinc-950";
const chipClass =
  "min-h-11 flex-1 inline-flex items-center justify-center rounded-lg border border-[var(--glass-card-border)] px-2 text-sm font-medium text-zinc-600 hover:border-accent hover:text-accent dark:text-zinc-300";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-solid px-3 py-1 text-white";

export function TaskCard({ task }: { task: Task }) {
  const todayDate = today();
  const quickDates = [
    { label: "Сьогодні", date: todayDate },
    { label: "Завтра", date: addDays(todayDate, 1) },
    { label: "+Тиждень", date: addDays(todayDate, 7) },
  ];

  return (
    <li
      aria-label={`Пріоритет: ${PRIORITY_LABEL[task.priority]}`}
      className={`glass-card rounded-2xl border border-l-4 p-3 ${PRIORITY_BORDER[task.priority]}`}
    >
      <div className="flex items-start gap-3">
        <form action={toggleComplete}>
          <input type="hidden" name="taskId" value={task.id} />
          <input
            type="hidden"
            name="completed"
            value={String(task.completed)}
          />
          <button
            type="submit"
            aria-pressed={task.completed}
            aria-label={task.completed ? "Позначити не виконаним" : "Позначити виконаним"}
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
              task.completed
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-zinc-300 text-transparent dark:border-zinc-700"
            }`}
          >
            ✓
          </button>
        </form>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-medium ${
                task.completed
                  ? "text-zinc-400 line-through dark:text-zinc-600"
                  : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {task.title}
            </span>
            {task.estimateMinutes != null && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                ~{task.estimateMinutes} хв
              </span>
            )}
            {task.pinned && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500" title="Розміщено вручну">
                📌
              </span>
            )}
          </div>

          {task.notes && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {task.notes}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <details className="group">
              <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-zinc-500 hover:bg-black/5 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200">
                Редагувати
              </summary>
              <form
                action={updateTask}
                className="mt-2 flex flex-col gap-2 rounded-lg bg-black/5 p-2 dark:bg-white/5"
              >
                <input type="hidden" name="taskId" value={task.id} />
                <input
                  name="title"
                  defaultValue={task.title}
                  className={fieldClass}
                />
                <textarea
                  name="notes"
                  defaultValue={task.notes ?? ""}
                  placeholder="Нотатки"
                  rows={2}
                  className={fieldClass}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="estimateMinutes"
                    defaultValue={task.estimateMinutes ?? ""}
                    placeholder="хв"
                    min={0}
                    className={`w-20 ${fieldClass}`}
                  />
                  <select
                    name="priority"
                    defaultValue={task.priority}
                    className={fieldClass}
                  >
                    <option value="low">Низький</option>
                    <option value="medium">Середній</option>
                    <option value="high">Високий</option>
                  </select>
                </div>
                <button type="submit" className={`self-start ${primaryButtonClass}`}>
                  Зберегти
                </button>
              </form>
            </details>

            <details className="group">
              <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-zinc-500 hover:bg-black/5 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200">
                Перенести
              </summary>
              <div className="mt-2 flex flex-col gap-2 rounded-lg bg-black/5 p-2 dark:bg-white/5">
                <div className="flex gap-1.5">
                  {quickDates.map(({ label, date }) => (
                    <form key={label} action={moveToDate} className="contents">
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="date" value={formatISODate(date)} />
                      <button type="submit" className={chipClass}>
                        {label}
                      </button>
                    </form>
                  ))}
                </div>
                <form action={moveToDate} className="flex items-center gap-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="date" name="date" required className={fieldClass} />
                  <button type="submit" className={primaryButtonClass}>
                    Перенести
                  </button>
                </form>
              </div>
            </details>

            <form action={deleteTask}>
              <input type="hidden" name="taskId" value={task.id} />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-zinc-400 hover:bg-black/5 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-red-400"
              >
                Видалити
              </button>
            </form>
          </div>
        </div>
      </div>
    </li>
  );
}
