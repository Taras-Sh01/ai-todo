"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

// Bottom tab bar (mobile) stays exactly these 3 — the burger drawer below
// additionally includes Календар, on purpose, per explicit request: the
// most-used destinations stay one thumb-tap away, Календар (newer, browsed
// less often) lives one level deeper in the menu instead of crowding the
// bar.
const BOTTOM_DESTINATIONS = [
  { href: "/today", label: "Сьогодні", accent: "text-accent-today" },
  { href: "/upcoming", label: "Найближчі", accent: "text-accent-upcoming" },
] as const;

const CALENDAR_DESTINATION = {
  href: "/calendar",
  label: "Календар",
  accent: "text-accent-calendar",
} as const;

// Desktop's TopNavLinks has room to show everything inline — no drawer
// needed there, so Календар is just a third link.
const TOP_NAV_DESTINATIONS = [...BOTTOM_DESTINATIONS, CALENDAR_DESTINATION] as const;

const TAB_ITEMS = [
  { href: "/", label: "Додати", accent: "text-accent" },
  ...BOTTOM_DESTINATIONS,
] as const;

const DRAWER_ITEMS = [
  { href: "/", label: "Додати", accent: "text-accent" },
  ...TOP_NAV_DESTINATIONS,
] as const;

function linkClasses(active: boolean, accent: string) {
  return active
    ? `${accent} font-medium`
    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100";
}

export function TopNavLinks() {
  const pathname = usePathname();
  return (
    <div className="hidden items-center gap-4 sm:flex">
      {TOP_NAV_DESTINATIONS.map(({ href, label, accent }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={`text-sm transition-colors duration-300 ${linkClasses(pathname === href, accent)}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Нижня навігація"
      className="glass-nav fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div className="flex h-14">
        {TAB_ITEMS.map(({ href, label, accent }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center text-xs transition-colors duration-300 ${linkClasses(active, accent)}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// MenuButton (lives inside the sticky header, for free alignment via its
// flex layout) and MenuPanel (mounted as a header *sibling* in layout.tsx,
// not nested inside it) share open/close state through this context rather
// than through DOM nesting. Why: <header> has position:sticky + a z-index,
// which creates its own stacking context — anything nested inside it is
// trapped there regardless of its own z-index. The delete-undo toast
// (DeleteUndoProvider) renders at the body root, above everything, so a
// backdrop/panel nested inside <header> could end up stuck *below* a toast
// that's supposed to be on top of it. Mounting MenuPanel outside <header>
// sidesteps that entirely.
const MenuContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MenuContext.Provider value={{ open, setOpen }}>{children}</MenuContext.Provider>;
}

function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}

export function MenuButton() {
  const { open, setOpen } = useMenu();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Відкрити меню"
      aria-expanded={open}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100 sm:hidden"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

export function MenuPanel() {
  const pathname = usePathname();
  const { open, setOpen } = useMenu();

  // Escape-to-close and body-scroll-lock only need to run while the panel
  // is actually open — registering/removing a listener, not calling
  // setState, so this isn't the set-state-in-effect pattern the project's
  // lint rule flags.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, setOpen]);

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Меню навігації"
        className={`glass-nav fixed inset-y-0 left-0 z-50 flex w-1/2 min-w-[13rem] flex-col gap-1 border-r p-4 pt-[calc(0.75rem+env(safe-area-inset-top))] transition-transform duration-300 sm:hidden ${
          open ? "translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">AI Todo</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Закрити меню"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {DRAWER_ITEMS.map(({ href, label, accent }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-base transition-colors duration-300 ${
                active
                  ? `${accent} bg-black/5 font-medium dark:bg-white/5`
                  : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
