"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Each destination carries its own section-identity accent (see globals.css)
// so the nav label — and, on its own page, the h1 — visibly shifts color as
// you move between tabs, not just the active/inactive weight.
const DESTINATIONS = [
  { href: "/today", label: "Сьогодні", accent: "text-accent-today" },
  { href: "/upcoming", label: "Найближчі", accent: "text-accent-upcoming" },
] as const;

const TAB_ITEMS = [
  { href: "/", label: "Додати", accent: "text-accent" },
  ...DESTINATIONS,
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
      {DESTINATIONS.map(({ href, label, accent }) => (
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
