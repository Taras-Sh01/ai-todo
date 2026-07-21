export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-32 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          AI Todo
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Диктуй або пиши задачі — AI сам розпізнає їх і побудує план на день і
          тиждень.
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          🚧 У розробці
        </p>
      </main>
    </div>
  );
}
