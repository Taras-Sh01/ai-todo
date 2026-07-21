"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { startOfWeek } from "@/lib/dates";
import type { ParsedTask } from "@/lib/parsed-task";
import { getOrCreateVisitorId } from "@/lib/visitor";

function refreshViews() {
  revalidatePath("/today");
  revalidatePath("/upcoming");
}

function requireTaskId(formData: FormData): number {
  const id = Number(formData.get("taskId"));
  if (!Number.isInteger(id)) throw new Error("Missing or invalid taskId");
  return id;
}

// Every mutation is scoped to (id AND ownerId) — not just id — so no one can
// act on a task that isn't theirs even if they somehow know its numeric id.
export async function toggleComplete(formData: FormData) {
  const id = requireTaskId(formData);
  const ownerId = await getOrCreateVisitorId();
  const wasCompleted = formData.get("completed") === "true";

  await db
    .update(tasks)
    .set({ completed: !wasCompleted, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)));

  refreshViews();
}

export async function deleteTask(formData: FormData) {
  const id = requireTaskId(formData);
  const ownerId = await getOrCreateVisitorId();

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)));
  refreshViews();
}

export async function updateTask(formData: FormData) {
  const id = requireTaskId(formData);
  const ownerId = await getOrCreateVisitorId();
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
    .where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)));

  refreshViews();
}

// Move to a specific day (any week) — always pins the task.
export async function moveToDate(formData: FormData) {
  const id = requireTaskId(formData);
  const ownerId = await getOrCreateVisitorId();
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
    .where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)));

  refreshViews();
}

// Confirmed AI-parsed tasks, not yet pinned — the auto-scheduler is free to
// move these; only an explicit human move (above) locks them in place.
export async function saveTasks(input: ParsedTask[]) {
  const ownerId = await getOrCreateVisitorId();

  const rows = input
    .filter((t) => t.title.trim().length > 0)
    .map((t) => {
      const scheduledDate = t.scheduledDate
        ? new Date(`${t.scheduledDate}T00:00:00.000Z`)
        : null;

      return {
        ownerId,
        title: t.title.trim(),
        notes: t.notes?.trim() || null,
        estimateMinutes: t.estimateMinutes ?? null,
        priority: t.priority,
        dueDate: t.dueDate ? new Date(`${t.dueDate}T00:00:00.000Z`) : null,
        scheduledDate,
        // Always re-derive from scheduledDate when present, rather than
        // trusting the model's own arithmetic, so the two never disagree.
        scheduledWeekStart: scheduledDate
          ? startOfWeek(scheduledDate)
          : new Date(`${t.scheduledWeekStart}T00:00:00.000Z`),
      };
    });

  if (rows.length === 0) return;

  await db.insert(tasks).values(rows);
  refreshViews();
}
