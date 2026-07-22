"use client";

import { useState, useSyncExternalStore } from "react";
import type { Theme } from "@/lib/theme";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(callback: () => void) {
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSystemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

// No window server-side (or during the client's first hydration pass) to
// know the OS preference — "light" is just a placeholder for that one
// instant. useSyncExternalStore corrects it right after via getSystemTheme,
// without the setState-in-effect pattern that hydration-diffing would
// otherwise require (and that the set-state-in-effect lint rule flags).
function getServerTheme(): Theme {
  return "light";
}

export function ThemeToggle({ initialTheme }: { initialTheme: Theme | null }) {
  const [explicitTheme, setExplicitTheme] = useState<Theme | null>(initialTheme);
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerTheme);
  const theme = explicitTheme ?? systemTheme;

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setExplicitTheme(next);
    document.documentElement.dataset.theme = next;
    // Literal kept in sync with THEME_COOKIE in src/lib/theme.ts by hand —
    // can't import it here, since that module also pulls in next/headers
    // (server-only) and would break the client bundle.
    document.cookie = `theme=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
      title={isDark ? "Світла тема" : "Темна тема"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
    >
      {isDark ? (
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
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ) : (
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
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
