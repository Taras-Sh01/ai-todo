"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribeNever() {
  return () => {};
}

// Speech-recognition support can't change during a page's lifetime (unlike
// theme/system dark-mode), so a real subscription would have nothing to
// listen for — this only exists to give useSyncExternalStore the hydration
// -safe "false on server, real value on client" split ThemeToggle also
// relies on, without an effect+setState that react-hooks/set-state-in-effect
// would flag.
function getSupportedSnapshot(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

function getServerSupportedSnapshot(): boolean {
  return false;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Доступ до мікрофона заборонено. Дозволь доступ у налаштуваннях браузера.",
  "service-not-allowed": "Доступ до мікрофона заборонено. Дозволь доступ у налаштуваннях браузера.",
  "no-speech": "Не почув жодного мовлення. Спробуй ще раз.",
  "audio-capture": "Не знайдено мікрофон.",
  network: "Проблема з мережею під час розпізнавання мовлення.",
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

type Options = {
  lang?: string;
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
};

// One `start()` call = one session: the recognizer resets its own final
// -transcript accumulator, and onResult always receives the full transcript
// for the current session (finalized chunks + trailing interim chunk), not
// just the latest delta — callers don't need to do their own accumulation
// across events, only across start() calls (see baseTextRef in CaptureForm).
export function useSpeechRecognition({ lang = "uk-UA", onResult, onError }: Options) {
  const supported = useSyncExternalStore(
    subscribeNever,
    getSupportedSnapshot,
    getServerSupportedSnapshot,
  );
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError?.("Голосове введення не підтримується цим браузером.");
      return;
    }

    finalTranscriptRef.current = "";
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      onResult(`${finalTranscriptRef.current}${interim}`);
    };

    recognition.onerror = (event) => {
      onError?.(ERROR_MESSAGES[event.error] ?? `Помилка розпізнавання мовлення: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [lang, onResult, onError]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Unmount safety net only — everyday stop goes through the button's own
  // stop() call above, not this.
  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  return { supported, listening, start, stop };
}
