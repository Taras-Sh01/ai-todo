import {
  pgTable,
  serial,
  text,
  integer,
  date,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  estimateMinutes: integer("estimate_minutes"),
  dueDate: date("due_date", { mode: "date" }),
  priority: priorityEnum("priority").notNull().default("medium"),
  completed: boolean("completed").notNull().default(false),
  // Which week this task belongs to (stored as that week's Monday). Set even
  // when scheduledDate is null, so a task can live in "this week, no specific
  // day yet" without being lost in a full backlog.
  scheduledWeekStart: date("scheduled_week_start", { mode: "date" }),
  // A specific pinned day within scheduledWeekStart, if any.
  scheduledDate: date("scheduled_date", { mode: "date" }),
  // True once a human has manually placed/moved this task — the scheduler
  // must never re-place a pinned task.
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
