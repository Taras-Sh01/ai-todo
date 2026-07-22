import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { startOfWeek, today as getToday } from "@/lib/dates";

// A task whose scheduled day has already passed while still incomplete never
// just sits "overdue" — the next time either view loads, it silently rolls
// forward onto today so nothing gets lost track of. A human who wants it
// somewhere specific can still move it manually afterward (see moveToDate in
// actions.ts). Both Today and Upcoming already render dynamically per-request
// (they read cookies() via getVisitorId), so running this write before their
// query guarantees the result is reflected in the very same render.
export async function rolloverOverdueTasks(ownerId: string): Promise<void> {
  const today = getToday();

  await db
    .update(tasks)
    .set({
      scheduledDate: today,
      scheduledWeekStart: startOfWeek(today),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.ownerId, ownerId),
        eq(tasks.completed, false),
        lt(tasks.scheduledDate, today),
      ),
    );
}
