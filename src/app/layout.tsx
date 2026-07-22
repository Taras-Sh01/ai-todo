import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getVisitorId } from "@/lib/visitor";
import { BottomTabBar, TopNavLinks } from "@/components/SiteNav";
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

  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
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
            {visitorId && (
              <span
                className="ml-auto text-xs text-zinc-400 dark:text-zinc-600"
                title="Твої задачі бачиш тільки ти — інші люди мають свою окрему сесію"
              >
                Сесія {visitorId.slice(0, 6)}
              </span>
            )}
          </nav>
        </header>
        <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
          {children}
        </div>
        <BottomTabBar />
      </body>
    </html>
  );
}
