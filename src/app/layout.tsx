import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { getVisitorId } from "@/lib/visitor";
import { getTheme } from "@/lib/theme";
import { BottomTabBar, TopNavLinks } from "@/components/SiteNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DeleteUndoProvider } from "@/components/DeleteUndoProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Todo",
  description: "AI-планер задач: диктуй або пиши, він побудує план на день і тиждень.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const visitorId = await getVisitorId();
  const theme = await getTheme();

  return (
    <html
      lang="uk"
      data-theme={theme ?? undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Runs before hydration so data-theme is always resolved (cookie,
            falling back to matchMedia) by first paint — both the CSS
            variables above and Tailwind's dark: variant key off it, and
            without this a first-time visitor's dark: utility classes would
            stay stuck on light until React mounts. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function () {
            try {
              var match = document.cookie.match(/(?:^|; )theme=(light|dark)/);
              var theme = match ? match[1] : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
              document.documentElement.setAttribute("data-theme", theme);
            } catch (e) {}
          })();`}
        </Script>
        <DeleteUndoProvider>
          <header className="glass-nav sticky top-0 z-40 border-b border-[var(--glass-nav-border)]">
            <nav
              aria-label="Верхня навігація"
              className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-3"
            >
              <Link
                href="/"
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
              >
                AI Todo
              </Link>
              <TopNavLinks />
              <div className="ml-auto flex items-center gap-1">
                {visitorId && (
                  <span
                    className="text-xs text-zinc-400 dark:text-zinc-600"
                    title="Твої задачі бачиш тільки ти — інші люди мають свою окрему сесію"
                  >
                    Сесія {visitorId.slice(0, 6)}
                  </span>
                )}
                <ThemeToggle initialTheme={theme} />
              </div>
            </nav>
          </header>
          <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
            {children}
          </div>
          <BottomTabBar />
        </DeleteUndoProvider>
      </body>
    </html>
  );
}
