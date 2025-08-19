export function StatCard({ label, value, help }) {
  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
      {help ? (
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{help}</div>
      ) : null}
    </div>
  )
}

