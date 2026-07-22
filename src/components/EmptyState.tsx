export function EmptyState({
  message,
  children,
}: {
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 text-center">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-zinc-300 dark:text-zinc-700"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
      <p className="text-sm text-zinc-400 dark:text-zinc-500">{message}</p>
      {children}
    </div>
  );
}
