"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { usePredictionJob } from "./prediction-store"

export default function PredictionStatusBanner({ ticker }) {
  const pathname = usePathname()
  const job = usePredictionJob(ticker)
  if (!job || job.state === "done" || pathname.endsWith("/predictions")) return null
  const pct = Math.floor(job.pct || 0)
  if (job.state === "error") {
    return (
      <div className="bg-red-600 text-white text-sm flex items-center justify-between px-4 py-2">
        <span>Prediction failed for {ticker}. Loading stops if you switch to a different stock.</span>
        <Link href={`/t/${ticker}/predictions`} className="underline">Retry</Link>
      </div>
    )
  }
  return (
    <div className="bg-primary text-primary-foreground text-sm flex items-center justify-between px-4 py-2">
      <span>
        Crunching the numbers for {ticker}… {pct}% - Loading continues if you switch tabs within {ticker}. Loading stops if you switch to a different stock.
      </span>
      <div className="flex items-center gap-3">
        <div className="w-24 h-1 bg-primary-foreground/20 rounded">
          <div className="h-full bg-primary-foreground" style={{ width: `${pct}%` }} />
        </div>
        <Link href={`/t/${ticker}/predictions`} className="underline">
          View progress
        </Link>
      </div>
    </div>
  )
}
