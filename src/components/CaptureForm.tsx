"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTasks } from "@/app/actions";
import type { ParsedTask } from "@/lib/parsed-task";

export function CaptureForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<ParsedTask[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
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
      setSuggestions(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Щось пішло не так.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!suggestions?.length) return;
    setSaving(true);
    setError(null);
    try {
      await saveTasks(suggestions);
      router.push("/day");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти задачі.");
      setSaving(false);
    }
  }

  function updateSuggestion(index: number, patch: Partial<ParsedTask>) {
    setSuggestions((prev) =>
      prev ? prev.map((s, i) => (i === index ? { ...s, ...patch } : s)) : prev,
    );
  }

  function removeSuggestion(index: number) {
    setSuggestions((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  if (suggestions === null) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Що потрібно зробити?
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Пиши вільним текстом — AI розпізнає окремі задачі та розкладе їх на
          день чи тиждень.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Наприклад: завтра подзвонити клієнту щодо контракту, закінчити звіт до пʼятниці, і десь на вихідних полагодити велосипед…"
          className="rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="self-start rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {loading ? "Розпізнаю…" : "Розпізнати"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Перевір, перед тим як зберегти
      </h1>

      <ul className="flex flex-col gap-3">
        {suggestions.map((s, i) => (
          <li
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start gap-2">
              <input
                value={s.title}
                onChange={(e) => updateSuggestion(i, { title: e.target.value })}
                className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={() => removeSuggestion(i)}
                aria-label="Прибрати"
                className="text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                min={0}
                value={s.estimateMinutes ?? ""}
                onChange={(e) =>
                  updateSuggestion(i, {
                    estimateMinutes: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="хв"
                className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <select
                value={s.priority}
                onChange={(e) =>
                  updateSuggestion(i, { priority: e.target.value as ParsedTask["priority"] })
                }
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="low">Низький</option>
                <option value="medium">Середній</option>
                <option value="high">Високий</option>
              </select>
              <input
                type="date"
                value={s.scheduledDate ?? ""}
                onChange={(e) =>
                  updateSuggestion(i, { scheduledDate: e.target.value || null })
                }
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              {!s.scheduledDate && (
                <span className="self-center text-xs text-zinc-400 dark:text-zinc-500">
                  без конкретного дня (цей тиждень)
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {suggestions.length === 0 && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Усі задачі прибрано — нема чого зберігати.
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || suggestions.length === 0}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {saving ? "Зберігаю…" : "Зберегти"}
        </button>
        <button
          type="button"
          onClick={() => setSuggestions(null)}
          disabled={saving}
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Назад до тексту
        </button>
      </div>
    </div>
  );
}
