"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DESTINATIONS = [
  { href: "/today", label: "Сьогодні" },
  { href: "/upcoming", label: "Найближчі" },
] as const;

const TAB_ITEMS = [{ href: "/", label: "Додати" }, ...DESTINATIONS] as const;

function linkClasses(active: boolean) {
  return active
    ? "text-accent font-medium"
    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100";
}

export function TopNavLinks() {
  const pathname = usePathname();
  return (
    <div className="hidden items-center gap-4 sm:flex">
      {DESTINATIONS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={`text-sm ${linkClasses(pathname === href)}`}
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
        {TAB_ITEMS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center text-xs ${linkClasses(active)}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
