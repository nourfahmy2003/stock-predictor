"use client"

import { useOverview } from "@/hooks/use-overview"
import { Skeleton } from "@/components/ui/skeleton"

export default function HeaderPrice({ ticker }) {
  const { data, err, loading, reload } = useOverview(ticker)

  if (loading) return <Skeleton className="h-10 w-32" />
  if (err)
    return (
      <div className="text-sm text-red-500">
        Failed to load. <button className="underline" onClick={reload}>Retry</button>
      </div>
    )

  const { price, changePercent } = data || {}

  return (
    <div className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100">
      {price ? price.toFixed(2) : "—"}
      <span className="ml-3 text-base font-normal text-zinc-500 dark:text-zinc-400">
        {changePercent != null ? `${(changePercent * 100).toFixed(2)}%` : "—"}
      </span>
    </div>
  )
}

