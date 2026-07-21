"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { addDays, startOfWeek } from "@/lib/dates";

function refreshViews() {
  revalidatePath("/day");
  revalidatePath("/week");
}

function requireTaskId(formData: FormData): number {
  const id = Number(formData.get("taskId"));
  if (!Number.isInteger(id)) throw new Error("Missing or invalid taskId");
  return id;
}

export async function toggleComplete(formData: FormData) {
  const id = requireTaskId(formData);
  const wasCompleted = formData.get("completed") === "true";

  await db
    .update(tasks)
    .set({ completed: !wasCompleted, updatedAt: new Date() })
    .where(eq(tasks.id, id));

  refreshViews();
}

export async function deleteTask(formData: FormData) {
  const id = requireTaskId(formData);
  await db.delete(tasks).where(eq(tasks.id, id));
  refreshViews();
}

export async function updateTask(formData: FormData) {
  const id = requireTaskId(formData);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title cannot be empty");

  const notes = String(formData.get("notes") ?? "").trim();
  const estimateRaw = formData.get("estimateMinutes");
  const estimateMinutes =
    estimateRaw && String(estimateRaw).trim() !== "" ? Number(estimateRaw) : null;
  const priority = String(formData.get("priority") ?? "medium") as
    | "low"
    | "medium"
    | "high";

  await db
    .update(tasks)
    .set({
      title,
      notes: notes || null,
      estimateMinutes,
      priority,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));

  refreshViews();
}

// Move to a specific day (any week) — always pins the task.
export async function moveToDate(formData: FormData) {
  const id = requireTaskId(formData);
  const dateStr = String(formData.get("date") ?? "");
  if (!dateStr) throw new Error("Missing date");

  const date = new Date(`${dateStr}T00:00:00.000Z`);

  await db
    .update(tasks)
    .set({
      scheduledDate: date,
      scheduledWeekStart: startOfWeek(date),
      pinned: true,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));

  refreshViews();
}

// Quick action: bump to next week, no specific day yet — still pinned, since
// it's an explicit human decision the scheduler must not override later.
export async function moveToNextWeek(formData: FormData) {
  const id = requireTaskId(formData);
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!row) throw new Error("Task not found");

  const currentWeekStart = row.scheduledWeekStart
    ? new Date(row.scheduledWeekStart)
    : startOfWeek(new Date());

  await db
    .update(tasks)
    .set({
      scheduledDate: null,
      scheduledWeekStart: addDays(currentWeekStart, 7),
      pinned: true,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));

  refreshViews();
}
