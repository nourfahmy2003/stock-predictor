"use client";

import useSWR from "swr";
import { useTheme } from "next-themes";
import { useReducedMotion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts";
import { api } from "@/lib/api";

const fetcher = (path) => api(path);

function fmtXLabel(v) {
  const d = new Date(v);
  return isNaN(d)
    ? v
    : d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function fmtXFull(v) {
  const d = new Date(v);
  return isNaN(d)
    ? v
    : d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export default function PriceChart({ ticker }) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();          // <—
  const isDark = resolvedTheme === "dark";       // <—
  const axisColor = isDark ? "#ffffff" : "hsl(var(--muted-foreground))";
  const tickColor = isDark ? "#ffffff" : "hsl(var(--foreground))";
  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "hsl(var(--border))";

  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/chart/${ticker}?range=1y&interval=1d` : null,
    fetcher,
    { dedupingInterval: 30_000, keepPreviousData: true }
  );

  if (isLoading) {
    return (
      <div
        className="h-80 w-full rounded-md border border-border bg-muted animate-pulse"
        aria-busy="true"
      />
    );
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
    );
  }

  const series = data?.series ?? [];
  if (series.length === 0) {
    return (
      <div className="h-80 w-full rounded-md border border-border flex items-center justify-center text-sm text-muted-foreground">
        No chart data
      </div>
    );
  }

  const prices = series.map((p) => p.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = Math.max((max - min) * 0.02, 0.5); // ensure some breathing room
  const domain = [min - pad, max + pad];
  const last = series[series.length - 1];

  const tooltipBg =
    theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";

  const formatY = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);

  return (
    <div className="h-80 w-full bg-background text-foreground" aria-live="polite">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={series}
          // ✅ equal inner padding (extra bottom for tilted ticks)
          margin={{ top: 24, right: 24, bottom: 44, left: 24 }}
        >
          <defs>
            {/* visible line/fill in dark mode */}
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.06} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
            opacity={0.25}
            vertical={false}
          />

           <XAxis
            dataKey="date"
            tickFormatter={fmtXLabel}
            tick={{ fill: tickColor, fontSize: 12 }}         // ← white in dark
            axisLine={{ stroke: axisColor, opacity: 0.35 }}  // ← axis line
            tickLine={{ stroke: axisColor, opacity: 0.35 }}  // ← small tick marks
            angle={-25}
            textAnchor="end"
            minTickGap={24}
            tickMargin={8}
            height={44}
          />

          <YAxis
            domain={domain}
            tickFormatter={formatY}
            tick={{ fill: tickColor, fontSize: 12 }}         // ← white in dark
            axisLine={{ stroke: axisColor, opacity: 0.35 }}
            tickLine={{ stroke: axisColor, opacity: 0.35 }}
            width={68}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.375rem",
              color: "hsl(var(--foreground))",
              padding: "0.5rem",
            }}
            labelFormatter={(v) => fmtXFull(v)}
            formatter={(value) => [formatY(value), "Close"]}
          />

          <Area
            type="monotone"
            dataKey="close"
            stroke="#60a5fa"                 // ✅ visible line
            strokeWidth={2}
            fill="url(#priceFill)"           // soft gradient fill
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={!reduceMotion}
          />

          {last && (
            <ReferenceDot
              x={last.date}
              y={last.close}
              r={4}
              fill="#60a5fa"
              stroke="hsl(var(--background))"
              strokeWidth={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
