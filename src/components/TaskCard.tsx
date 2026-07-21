import type { Task } from "@/db/schema";
import { deleteTask, moveToDate, toggleComplete, updateTask } from "@/app/actions";

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Низький",
  medium: "Середній",
  high: "Високий",
};

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-zinc-400",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

export function TaskCard({ task }: { task: Task }) {
  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
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
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
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
            <span
              className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`}
              title={`Пріоритет: ${PRIORITY_LABEL[task.priority]}`}
            />
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
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                Редагувати
              </summary>
              <form
                action={updateTask}
                className="mt-2 flex flex-col gap-2 rounded-md bg-zinc-50 p-2 dark:bg-zinc-900"
              >
                <input type="hidden" name="taskId" value={task.id} />
                <input
                  name="title"
                  defaultValue={task.title}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                <textarea
                  name="notes"
                  defaultValue={task.notes ?? ""}
                  placeholder="Нотатки"
                  rows={2}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="estimateMinutes"
                    defaultValue={task.estimateMinutes ?? ""}
                    placeholder="хв"
                    min={0}
                    className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <select
                    name="priority"
                    defaultValue={task.priority}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <option value="low">Низький</option>
                    <option value="medium">Середній</option>
                    <option value="high">Високий</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="self-start rounded bg-zinc-900 px-3 py-1 text-white dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Зберегти
                </button>
              </form>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                Перенести
              </summary>
              <form
                action={moveToDate}
                className="mt-2 flex items-center gap-2 rounded-md bg-zinc-50 p-2 dark:bg-zinc-900"
              >
                <input type="hidden" name="taskId" value={task.id} />
                <input
                  type="date"
                  name="date"
                  required
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-3 py-1 text-white dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Перенести
                </button>
              </form>
            </details>

            <form action={deleteTask}>
              <input type="hidden" name="taskId" value={task.id} />
              <button
                type="submit"
                className="text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
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
