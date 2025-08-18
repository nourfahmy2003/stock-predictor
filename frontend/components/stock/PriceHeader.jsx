"use client"

import { format } from "date-fns"

export default function PriceHeader({ quote }) {
  const pct = quote.changePercent ?? 0
  const pos = (pct ?? 0) >= 0
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-4xl font-bold tracking-tight">
        {quote.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {quote.currency}
      </div>
      <div
        className={`text-sm px-2 py-0.5 rounded-full ${pos ? "text-emerald-600 bg-emerald-600/10" : "text-rose-600 bg-rose-600/10"}`}
      >
        {pos ? "↑" : "↓"} {Math.abs(quote.change ?? 0).toFixed(2)} ({Math.abs(pct).toFixed(2)}%)
      </div>
      <div className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
        {format(new Date(), "PPp")}
      </div>
    </div>
  )
}
