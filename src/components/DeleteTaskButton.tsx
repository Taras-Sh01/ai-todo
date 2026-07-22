"use client";

import { useDeleteUndo } from "@/components/DeleteUndoProvider";

export function DeleteTaskButton({ taskId, title }: { taskId: number; title: string }) {
  const { scheduleDelete } = useDeleteUndo();

  return (
    <button
      type="button"
      onClick={() => scheduleDelete({ id: taskId, title })}
      className="inline-flex min-h-11 items-center rounded-lg px-2 text-zinc-400 hover:bg-black/5 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-red-400"
    >
      Видалити
    </button>
  );
}
