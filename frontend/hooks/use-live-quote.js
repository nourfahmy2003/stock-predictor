"use client"

import { useMemo } from "react"

import { useAnalysisReport } from "@/components/stock/use-analysis-report"
import { useAnalysisIntervalValue } from "@/hooks/use-analysis-interval"

const DEFAULT_INTERVAL = "5m"

export function useLiveQuote(symbol, opts = {}) {
  const interval = useAnalysisIntervalValue(symbol, opts.interval || DEFAULT_INTERVAL)
  const { state, report, error, refresh } = useAnalysisReport(symbol, interval, {
    ttlMs: opts.ttlMs,
  })

  const loading = state === "idle" || state === "loading"

  const quote = useMemo(() => {
    if (!report) return null
    return {
      price: typeof report.price === "number" ? report.price : null,
      asOf: report.as_of || null,
      interval: report.interval || interval,
    }
  }, [report, interval])

  return {
    quote,
    interval,
    report,
    loading,
    error,
    refresh,
  }
}
