"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTasks } from "@/app/actions";

export function CaptureForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не вдалося розпізнати текст.");
      if (!data.tasks?.length) {
        setError("Не вдалося виділити жодної задачі з цього тексту.");
        return;
      }
      await saveTasks(data.tasks);
      router.push("/upcoming");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Щось пішло не так.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8 sm:py-16">
      <h1 className="text-2xl font-semibold text-accent transition-colors duration-300">
        Що потрібно зробити?
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Пиши вільним текстом — AI розпізнає окремі задачі, сам розкладе їх на
        дні (будні, з урахуванням завантаженості) і одразу додасть у розклад.
        Поправити щось завжди можна в «Найближчі».
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Наприклад: завтра подзвонити клієнту щодо контракту, закінчити звіт до пʼятниці, і десь на вихідних полагодити велосипед…"
        className="glass-card rounded-2xl border p-3 text-base text-zinc-900 dark:text-zinc-50"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-accent-solid px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Додаю…" : "Додати задачі"}
      </button>
    </div>
  );
}
