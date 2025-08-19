"use client"

import useSWR from "swr"
import { useTheme } from "next-themes"
import { useReducedMotion } from "framer-motion"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts"

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Network error")
    return r.json()
  })

export default function PriceChart({ ticker }) {
  const { theme } = useTheme()
  const reduceMotion = useReducedMotion()
  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/api/chart/${ticker}?range=1y&interval=1d` : null,
    fetcher,
    { dedupingInterval: 30000, keepPreviousData: true }
  )

  if (isLoading) {
    return (
      <div
        className="h-80 w-full rounded-md border border-border bg-muted animate-pulse"
        aria-busy="true"
      />
    )
  }

  if (error) {
    return (
      <div
        className="h-80 w-full rounded-md border border-border flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
        role="alert"
      >
        <p>Failed to load price data.</p>
        <button
          onClick={() => mutate()}
          className="px-2 py-1 text-xs border border-border rounded-md"
        >
          Retry
        </button>
      </div>
    )
  }

  const series = data?.series ?? []
  if (series.length === 0) {
    return (
      <div className="h-80 w-full rounded-md border border-border flex items-center justify-center text-sm text-muted-foreground">
        No chart data
      </div>
    )
  }
  const prices = series.map((p) => p.c)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const pad = (max - min) * 0.02
  const domain = [min - pad, max + pad]
  const last = series[series.length - 1]

  const tooltipBg = theme === "dark" ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)"

  const formatY = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v)

  const formatX = (v) => {
    const d = new Date(v)
    return isNaN(d)
      ? v
      : d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })
  }

  return (
    <div className="h-80 w-full" aria-live="polite">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
            opacity={0.3}
            vertical={false}
          />
          <XAxis
            dataKey="t"
            tickFormatter={formatX}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={domain}
            tickFormatter={formatY}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.375rem",
              color: "hsl(var(--foreground))",
              padding: "0.5rem",
            }}
            labelFormatter={(v) => formatX(v)}
            formatter={(value) => formatY(value)}
          />
          <Area
            type="monotone"
            dataKey="c"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary) / 0.2)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={!reduceMotion}
          />
          {last && (
            <ReferenceDot
              x={last.t}
              y={last.c}
              r={4}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
