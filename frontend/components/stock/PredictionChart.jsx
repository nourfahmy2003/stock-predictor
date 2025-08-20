"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
} from "recharts"
import { fmtPrice } from "@/lib/format"

function formatDateShort(s) {
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "2-digit" })
}

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload || !payload.length) return null
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
      <div>{fmtPrice(payload[0].value, currency)}</div>
    </div>
  )
}

export default function PredictionChart({ data, currency }) {
  const filtered = data.filter((d) => Number.isFinite(d.pred_price))
  if (filtered.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-muted-foreground">No forecast yet</div>
    )
  }
  const prices = filtered.map((d) => d.pred_price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const pad = Math.max((max - min) * 0.02, 0.5)
  const domain = [min - pad, max + pad]
  const first = filtered[0]
  const last = filtered[filtered.length - 1]
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  return (
    <div className="h-72 w-full bg-background text-foreground">
      <ResponsiveContainer>
        <LineChart data={filtered} margin={{ top: 24, right: 32, bottom: 24, left: 48 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
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
            dataKey="pred_price"
            stroke="currentColor"
            strokeWidth={2}
            dot={{ r: 3, fill: "currentColor" }}
            activeDot={{ r: 5 }}
            isAnimationActive={!prefersReducedMotion}
          />
          <ReferenceLine x={first.date} strokeOpacity={0.12} />
          <ReferenceDot x={first.date} y={first.pred_price} r={4} fill="currentColor" />
          <ReferenceDot
            x={last.date}
            y={last.pred_price}
            r={4}
            fill="currentColor"
            label={{
              position: "top",
              value: fmtPrice(last.pred_price, currency),
              fill: "currentColor",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
