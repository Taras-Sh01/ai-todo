export interface ParsedTask {
  title: string;
  notes: string | null;
  estimateMinutes: number | null;
  priority: "low" | "medium" | "high";
  dueDate: string | null; // YYYY-MM-DD
  scheduledDate: string | null; // YYYY-MM-DD
  scheduledWeekStart: string; // YYYY-MM-DD, Monday of the target week
}

const PRIORITIES = new Set(["low", "medium", "high"]);

function asDateStringOrNull(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

// Defensive normalization of whatever the model actually returned — tool_choice
// makes the shape *likely* correct, but nothing guarantees it at runtime.
export function normalizeParsedTasks(input: unknown, fallbackWeekStart: string): ParsedTask[] {
  if (!input || typeof input !== "object" || !Array.isArray((input as { tasks?: unknown }).tasks)) {
    return [];
  }

  const raw = (input as { tasks: unknown[] }).tasks;

  return raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => {
      const title = typeof t.title === "string" ? t.title.trim() : "";
      const priority = typeof t.priority === "string" && PRIORITIES.has(t.priority)
        ? (t.priority as ParsedTask["priority"])
        : "medium";

      return {
        title,
        notes: typeof t.notes === "string" && t.notes.trim() ? t.notes.trim() : null,
        estimateMinutes:
          typeof t.estimateMinutes === "number" && Number.isFinite(t.estimateMinutes)
            ? Math.round(t.estimateMinutes)
            : null,
        priority,
        dueDate: asDateStringOrNull(t.dueDate),
        scheduledDate: asDateStringOrNull(t.scheduledDate),
        scheduledWeekStart: asDateStringOrNull(t.scheduledWeekStart) ?? fallbackWeekStart,
      };
    })
    .filter((t) => t.title.length > 0);
}
