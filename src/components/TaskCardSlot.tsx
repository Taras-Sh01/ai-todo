"use client";

import { useDeleteUndo } from "@/components/DeleteUndoProvider";

// Wraps a server-rendered TaskCard so it can disappear the instant its
// delete button is pressed, without waiting for the deferred server
// deletion (see DeleteUndoProvider) to actually complete.
export function TaskCardSlot({
  taskId,
  children,
}: {
  taskId: number;
  children: React.ReactNode;
}) {
  const { isPending } = useDeleteUndo();
  if (isPending(taskId)) return null;
  return <>{children}</>;
}
