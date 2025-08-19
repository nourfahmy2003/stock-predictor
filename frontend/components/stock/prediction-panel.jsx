"use client"
import { useEffect } from "react"
import { usePrediction } from "./prediction-store"
import PredictionChart from "./PredictionChart"

export function PredictionPanel({ ticker }) {
  const { active, error, forecast, run } = usePrediction()

  useEffect(() => {
    if (ticker) run(ticker)
  }, [ticker])

  if (error)
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
        {error} <button className="ml-2 underline" onClick={() => run(ticker)}>Retry</button>
      </div>
    )

  if (active && active.ticker === ticker)
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-6 text-zinc-300">
        <div className="w-full max-w-md">
          <div className="mb-2 text-center text-sm">Crunching the numbers… this may take a few minutes.</div>
          <div className="h-2 w-full rounded-full bg-zinc-700/50">
            <div className="h-2 w-1/3 animate-pulse rounded-full bg-blue-500/70" />
          </div>
        </div>
      </div>
    )

  if (!forecast) return null

  return <PredictionChart data={forecast} />
}

