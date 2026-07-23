"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTasks } from "@/app/actions";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

// Splices a dictated session's transcript onto whatever was already in the
// textarea when recording started, without doubling up whitespace.
function joinDictation(base: string, session: string): string {
  const trimmedBase = base.replace(/\s+$/, "");
  if (!trimmedBase) return session;
  if (!session) return trimmedBase;
  return `${trimmedBase} ${session}`;
}

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0014 0v-1M12 18v4M8 22h8" />
    </svg>
  );
}

export function CaptureForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseTextRef = useRef("");

  const handleSpeechResult = useCallback((session: string) => {
    setText(joinDictation(baseTextRef.current, session));
  }, []);

  const handleSpeechError = useCallback((message: string) => {
    setError(message);
  }, []);

  const {
    supported: speechSupported,
    listening,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition({ onResult: handleSpeechResult, onError: handleSpeechError });

  function handleMicClick() {
    if (listening) {
      stopListening();
      return;
    }
    setError(null);
    baseTextRef.current = text;
    startListening();
  }

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
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Наприклад: завтра подзвонити клієнту щодо контракту, закінчити звіт до пʼятниці, і десь на вихідних полагодити велосипед…"
          className="glass-card w-full rounded-2xl border p-3 pr-14 text-base text-zinc-900 dark:text-zinc-50"
        />
        {speechSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={listening ? "Зупинити диктування" : "Диктувати голосом"}
            title={listening ? "Зупинити диктування" : "Диктувати голосом"}
            className={`absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              listening
                ? "animate-mic-pulse bg-red-500 text-white"
                : "text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
            }`}
          >
            <MicIcon />
          </button>
        )}
      </div>
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
