"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { fmtPrice } from "@/lib/format"

function formatDateShort(s) {
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "2-digit" })
}

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload || !payload.length) return null
  const val = payload.find((p) => Number.isFinite(p.value))?.value
  if (!Number.isFinite(val)) return null
  const isDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  const style = {
    backgroundColor: isDark ? "rgba(0,0,0,0.9)" : "#fff",
    color: isDark ? "#fff" : "#000",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    padding: "0.5rem",
    borderRadius: "0.25rem",
  }
  return (
    <div style={style}>
      <div>{new Date(label).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}</div>
      <div>{fmtPrice(val, currency)}</div>
    </div>
  )
}

export default function PredictionChart({ data, currency }) {
  const filtered = data.filter(
    (d) =>
      Number.isFinite(d.actual) ||
      Number.isFinite(d.pred_back) ||
      Number.isFinite(d.pred_fore)
  )
  if (filtered.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-muted-foreground">No forecast yet</div>
    )
  }
  const prices = filtered.flatMap((d) =>
    [d.actual, d.pred_back, d.pred_fore].filter(Number.isFinite)
  )
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const pad = Math.max((max - min) * 0.02, 0.5)
  const domain = [min - pad, max + pad]
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  return (
    <div className="h-72 w-full bg-background">
      <ResponsiveContainer>
        <LineChart data={filtered} margin={{ top: 24, right: 32, bottom: 24, left: 48 }}>
          <CartesianGrid strokeOpacity={0.12} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            minTickGap={28}
            interval="preserveStartEnd"
            tick={{ fill: "currentColor" }}
            stroke="currentColor"
          />
          <YAxis
            domain={domain}
            tick={{ fill: "currentColor" }}
            stroke="currentColor"
            tickFormatter={(v) => fmtPrice(v, currency)}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Line
            dataKey="actual"
            stroke="currentColor"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!prefersReducedMotion}
          />
          <Line
            dataKey="pred_back"
            stroke="var(--chart-line)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!prefersReducedMotion}
          />
          <Line
            dataKey="pred_fore"
            stroke="var(--chart-forecast, var(--chart-line))"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={!prefersReducedMotion}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
