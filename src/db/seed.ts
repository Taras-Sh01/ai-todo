import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tasks } from "./schema";
import { today as getToday, startOfWeek, addDays } from "../lib/dates";

config({ path: ".env.local" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const db = drizzle(postgres(databaseUrl, { max: 1 }));

  const today = getToday();
  const weekStart = startOfWeek(today);
  const friday = addDays(weekStart, 4);

  await db.insert(tasks).values([
    {
      title: "Подзвонити клієнту щодо контракту",
      priority: "high",
      estimateMinutes: 30,
      scheduledWeekStart: weekStart,
      scheduledDate: today,
    },
    {
      title: "Закінчити звіт",
      priority: "high",
      estimateMinutes: 120,
      dueDate: friday,
      scheduledWeekStart: weekStart,
      scheduledDate: friday,
    },
    {
      title: "Полагодити велосипед",
      priority: "low",
      estimateMinutes: 60,
      scheduledWeekStart: weekStart,
      scheduledDate: null,
    },
    {
      title: "Купити продукти",
      priority: "medium",
      estimateMinutes: 45,
      scheduledWeekStart: weekStart,
      scheduledDate: today,
    },
  ]);

  console.log("Seeded sample tasks.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
