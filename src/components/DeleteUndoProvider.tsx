"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { deleteTaskById } from "@/app/actions";

export const UNDO_WINDOW_MS = 5000;

type DeleteUndoContextValue = {
  scheduleDelete: (task: { id: number; title: string }) => void;
  isPending: (id: number) => boolean;
};

const DeleteUndoContext = createContext<DeleteUndoContextValue | null>(null);

export function useDeleteUndo(): DeleteUndoContextValue {
  const ctx = useContext(DeleteUndoContext);
  if (!ctx) throw new Error("useDeleteUndo must be used within DeleteUndoProvider");
  return ctx;
}

// Deletion is deferred, not immediate: the row stays in the database until
// the undo window actually elapses, so "Скасувати" is a real cancellation,
// not a re-insert-and-hope. Only the visual removal (via TaskCardSlot) is
// optimistic.
export function DeleteUndoProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Map<number, string>>(new Map());
  const timeoutsRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  // Cleans up any still-running timers if this provider ever unmounts (in
  // practice it wraps the whole app in the root layout, so this is mostly
  // hygiene for dev Fast Refresh) — clears timers, doesn't call setState,
  // so this isn't the set-state-in-effect pattern the project's lint rule
  // flags.
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const timeoutId of timeouts.values()) clearTimeout(timeoutId);
    };
  }, []);

  const scheduleDelete = useCallback((task: { id: number; title: string }) => {
    setPending((prev) => new Map(prev).set(task.id, task.title));

    const timeoutId = setTimeout(() => {
      timeoutsRef.current.delete(task.id);
      setPending((prev) => {
        const next = new Map(prev);
        next.delete(task.id);
        return next;
      });
      void deleteTaskById(task.id);
    }, UNDO_WINDOW_MS);

    timeoutsRef.current.set(task.id, timeoutId);
  }, []);

  const cancelDelete = useCallback((id: number) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) clearTimeout(timeoutId);
    timeoutsRef.current.delete(id);
    setPending((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isPending = useCallback((id: number) => pending.has(id), [pending]);

  return (
    <DeleteUndoContext.Provider value={{ scheduleDelete, isPending }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] z-50 flex flex-col items-center gap-2 px-4 sm:bottom-4"
      >
        {[...pending.entries()].map(([id, title]) => (
          <div
            key={id}
            role="status"
            className="glass-card pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 shadow-lg"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-200">
              Задачу «{title}» видалено
            </span>
            <button
              type="button"
              onClick={() => cancelDelete(id)}
              className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-accent hover:underline"
            >
              Скасувати
            </button>
            <div
              className="undo-toast-bar absolute bottom-0 left-0 h-0.5 w-full bg-accent-solid"
              style={{ animationDuration: `${UNDO_WINDOW_MS}ms` }}
            />
          </div>
        ))}
      </div>
    </DeleteUndoContext.Provider>
  );
}
