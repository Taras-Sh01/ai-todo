import Anthropic from "@anthropic-ai/sdk";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks as tasksTable } from "@/db/schema";
import { WEEKDAY_LABELS, addDays, formatISODate, startOfWeek, today as getToday } from "@/lib/dates";
import { normalizeParsedTasks } from "@/lib/parsed-task";
import { DEFAULT_ESTIMATE_MINUTES, MAX_LOOKAHEAD_DAYS, scheduleTasks } from "@/lib/schedule";
import { getOrCreateVisitorId } from "@/lib/visitor";

const TASKS_TOOL: Anthropic.Tool = {
  name: "extracted_tasks",
  description:
    "Structured list of actionable tasks extracted from the user's free-form text.",
  input_schema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Concise, actionable task title, same language as the input.",
            },
            notes: { type: ["string", "null"], description: "Extra detail, or null." },
            estimateMinutes: {
              type: ["integer", "null"],
              description: "Best-guess duration in minutes, or null if truly unknown.",
            },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            dueDate: {
              type: ["string", "null"],
              description: "YYYY-MM-DD hard deadline, only if explicitly implied, else null.",
            },
            scheduledDate: {
              type: ["string", "null"],
              description: "YYYY-MM-DD specific day, only if a specific day is implied, else null.",
            },
            impliedWeekday: {
              type: ["string", "null"],
              enum: [...WEEKDAY_LABELS, null],
              description:
                "Якщо в тексті названо день тижня, але НЕ можна/не варто визначити " +
                "одну конкретну дату — типово через повторювану фразу ('щопонеділка', " +
                "'щотижня у четвер', 'по пʼятницях') — постав сюди назву цього дня " +
                "тижня. Якщо для задачі вже визначена конкретна scheduledDate, це " +
                "поле лишається null.",
            },
            scheduledWeekStart: {
              type: "string",
              description:
                "YYYY-MM-DD Monday of the target week. Always set, even with no timing implied (use the current week).",
            },
          },
          required: ["title", "priority", "scheduledWeekStart"],
        },
      },
    },
    required: ["tasks"],
  },
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const today = getToday();
  const weekStart = startOfWeek(today);
  const todayIso = formatISODate(today);
  const weekStartIso = formatISODate(weekStart);
  const weekday = today.toLocaleDateString("uk-UA", { weekday: "long", timeZone: "UTC" });

  const anthropic = new Anthropic({ apiKey });

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: `Ти розпізнаєш вільний текст користувача і перетворюєш його на список окремих задач.
Сьогодні ${todayIso} (${weekday}). Поточний тиждень починається ${weekStartIso} (понеділок).

Правила:
- Розбий текст на окремі дії (одна задача = одна дія).
- Визнач пріоритет (low/medium/high) і, якщо можливо оцінити, орієнтовну тривалість у хвилинах.
- Якщо в тексті явно згадано конкретний день ("завтра", "у п'ятницю", "20 числа") — постав scheduledDate (YYYY-MM-DD) і scheduledWeekStart (понеділок того тижня).
- Якщо йдеться про дедлайн — постав ще й dueDate.
- Якщо конкретного дня немає, але з тексту зрозуміло, що це поточний тиждень (або взагалі без прив'язки до часу) — постав тільки scheduledWeekStart (${weekStartIso}), а scheduledDate залиш null.
- Якщо день тижня згаданий у повторюваному контексті (наприклад "щопонеділка", "щотижня у вівторок", "по пʼятницях") і немає жодної конкретної календарної дати — НЕ став scheduledDate сам; постав замість неї impliedWeekday з назвою цього дня. scheduledDate і impliedWeekday ніколи не заповнені одночасно.
- scheduledWeekStart обов'язковий завжди.
- Назви задач пиши тією ж мовою, що й вхідний текст.`,
      messages: [{ role: "user", content: text }],
      tools: [TASKS_TOOL],
      tool_choice: { type: "tool", name: "extracted_tasks" },
    });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status ?? 502 : 502;
    const message = err instanceof Error ? err.message : "Unknown error calling Claude";
    return NextResponse.json({ error: message }, { status });
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    return NextResponse.json(
      { error: "Model did not return structured output." },
      { status: 502 },
    );
  }

  const parsedTasks = normalizeParsedTasks(toolUse.input, weekStartIso);

  // Existing incomplete tasks' load, so auto-placement doesn't overload a day
  // that's already busy with previously-saved tasks.
  const ownerId = await getOrCreateVisitorId();
  const windowEnd = addDays(today, MAX_LOOKAHEAD_DAYS);
  const existingRows = await db
    .select({
      scheduledDate: tasksTable.scheduledDate,
      estimateMinutes: tasksTable.estimateMinutes,
    })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.ownerId, ownerId),
        eq(tasksTable.completed, false),
        isNotNull(tasksTable.scheduledDate),
        gte(tasksTable.scheduledDate, today),
        lte(tasksTable.scheduledDate, windowEnd),
      ),
    );

  const existingLoad = new Map<string, number>();
  for (const row of existingRows) {
    if (!row.scheduledDate) continue;
    const key = formatISODate(row.scheduledDate);
    existingLoad.set(
      key,
      (existingLoad.get(key) ?? 0) + (row.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES),
    );
  }

  const scheduled = scheduleTasks(parsedTasks, existingLoad);
  return NextResponse.json({ tasks: scheduled });
}
