import { cookies } from "next/headers";

export const THEME_COOKIE = "theme";
export type Theme = "light" | "dark";

// Read-only — safe from Server Components. Absent cookie means "no explicit
// choice yet," so the caller should fall back to the OS's prefers-color
// -scheme (handled purely in CSS, see globals.css) rather than a hardcoded
// default here.
export async function getTheme(): Promise<Theme | null> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === "light" || value === "dark" ? value : null;
}
