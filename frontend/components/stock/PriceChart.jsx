"use client";

import { useState, useMemo } from "react";
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

const RANGE_RULES = {
  '1m': { step: { minutes: 5 } },
  '5m': { step: { minutes: 30 } },
  '1d': { step: { hours: 1 } },
  '1mo': { step: { weeks: 1 } },
  '3mo': { step: { weeks: 2 } },
  '1y': { step: { months: 1 } },
  '5y': { step: { years: 1 } },
};

const ticksForWidth = (w) => Math.max(5, Math.min(12, Math.floor(w / 80)));

function addStep(d, step) {
  const n = new Date(d);
  if (step.years) n.setUTCFullYear(n.getUTCFullYear() + step.years);
  if (step.months) n.setUTCMonth(n.getUTCMonth() + step.months);
  if (step.weeks) n.setUTCDate(n.getUTCDate() + step.weeks * 7);
  if (step.days) n.setUTCDate(n.getUTCDate() + step.days);
  if (step.hours) n.setUTCHours(n.getUTCHours() + step.hours, 0, 0, 0);
  if (step.minutes) n.setUTCMinutes(n.getUTCMinutes() + step.minutes, 0, 0, 0);
  return n;
}

function floorToStep(d, step) {
  const n = new Date(d);
  if (step.years) n.setUTCFullYear(n.getUTCFullYear(), 0, 1);
  if (step.months) n.setUTCMonth(Math.floor(n.getUTCMonth() / step.months) * step.months, 1);
  if (step.weeks) {
    const day = n.getUTCDay();
    n.setUTCDate(n.getUTCDate() - day);
  }
  if (step.days) n.setUTCHours(0, 0, 0, 0);
  if (step.hours) n.setUTCMinutes(0, 0, 0, 0);
  if (step.minutes) n.setUTCMinutes(Math.floor(n.getUTCMinutes() / step.minutes) * step.minutes, 0, 0, 0);
  return n;
}

const widthTooTight = (w) => w < 600;

function formatDate(d, opts, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).format(d);
}

function getMonth(d, tz) {
  return parseInt(formatDate(d, { month: 'numeric' }, tz));
}
function getYear(d, tz) {
  return parseInt(formatDate(d, { year: 'numeric' }, tz));
}
function monthBoundary(d, prev, tz) {
  if (!prev) return false;
  return getMonth(d, tz) !== getMonth(prev, tz);
}
function yearChanged(d, prev, tz) {
  if (!prev) return false;
  return getYear(d, tz) !== getYear(prev, tz);
}
function isJan(d, tz) {
  return getMonth(d, tz) === 1;
}

function formatTick(rangeKey, d, prev, width, tz) {
  switch (rangeKey) {
    case '1m':
      return formatDate(d, { hour: 'numeric', minute: '2-digit' }, tz);
    case '5m':
      return formatDate(d, { hour: 'numeric', minute: '2-digit' }, tz);
    case '1d':
      return formatDate(d, { hour: 'numeric' }, tz).replace(' ', '');
    case '1mo':
      return `${formatDate(d, { month: 'short' }, tz)} ${formatDate(d, { day: 'numeric' }, tz)}`;
    case '3mo':
      return widthTooTight(width)
        ? formatDate(d, { month: 'short' }, tz)
        : `${formatDate(d, { month: 'short' }, tz)} ${formatDate(d, { day: 'numeric' }, tz)}`;
    case '1y':
      return isJan(d, tz) && yearChanged(d, prev, tz)
        ? `${formatDate(d, { month: 'short' }, tz)} ’${formatDate(d, { year: '2-digit' }, tz)}`
        : formatDate(d, { month: 'short' }, tz);
    case '5y':
      return formatDate(d, { year: 'numeric' }, tz);
    default:
      return formatDate(d, { month: 'short', day: 'numeric' }, tz);
  }
}

function formatTooltip(d, rangeKey, tz) {
  const tzAbbr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')?.value;

  if (rangeKey === '1m' || rangeKey === '5m' || rangeKey === '1d') {
    return `${formatDate(d, { weekday: 'short' }, tz)}, ${formatDate(d, { month: 'short' }, tz)} ${formatDate(d, { day: 'numeric' }, tz)} • ${formatDate(d, { hour: 'numeric', minute: '2-digit' }, tz)} ${tzAbbr}`;
  }
  return `${formatDate(d, { weekday: 'short' }, tz)}, ${formatDate(d, { month: 'short' }, tz)} ${formatDate(d, { day: 'numeric' }, tz)}, ${formatDate(d, { year: 'numeric' }, tz)}`;
}

function generateTicks(rangeKey, series, width) {
  const rule = RANGE_RULES[rangeKey];
  if (!rule || series.length === 0) return [];
  const start = new Date(series[0].ts);
  const end = new Date(series[series.length - 1].ts);
  let t = floorToStep(start, rule.step);
  if (t < start) t = addStep(t, rule.step);
  const ticks = [];
  while (t <= end) {
    ticks.push(t.getTime());
    t = addStep(t, rule.step);
  }
  const desired = ticksForWidth(width);
  if (ticks.length > desired) {
    const step = (ticks.length - 1) / (desired - 1);
    return Array.from({ length: desired }, (_, i) => {
      const idx = Math.round(i * step);
      return ticks[idx];
    });
  }
  return ticks;
}

export default function PriceChart({
  ticker,
  range = "1y",
  interval = "1d",
  refreshMs = 30_000,
  rangeKey,
}) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();          // <—
  const isDark = resolvedTheme === "dark";       // <—
  const axisColor = isDark ? "#ffffff" : "hsl(var(--muted-foreground))";
  const tickColor = isDark ? "#ffffff" : "hsl(var(--foreground))";
  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "hsl(var(--border))";

  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/chart/${ticker}?range=${range}&interval=${interval}` : null,
    fetcher,
    { dedupingInterval: refreshMs, refreshInterval: refreshMs, keepPreviousData: true }
  );
  const [width, setWidth] = useState(0);

  const series = useMemo(
    () => (data?.series || []).map((p) => ({ ...p, ts: new Date(p.date).getTime() })),
    [data]
  );
  const rk = rangeKey || range;
  const ticks = useMemo(() => generateTicks(rk, series, width), [rk, series, width]);

  const { prices, domain, yTicks, last } = useMemo(() => {
    const prices = series.map((p) => p.close);
    if (prices.length === 0) {
      return { prices, domain: [0, 1], yTicks: [], last: null };
    }
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = Math.max((max - min) * 0.02, 0.5);
    const domain = [min - pad, max + pad];
    const count = 6;
    const step = (domain[1] - domain[0]) / (count - 1);
    const yTicks = Array.from({ length: count }, (_, i) => domain[0] + step * i);
    const last = series[series.length - 1];
    return { prices, domain, yTicks, last };
  }, [series]);

  if (isLoading) {
    return (
      <div
        className="h-70 w-full rounded-md border border-border bg-muted animate-pulse"
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

  if (prices.length === 0) {
    return (
      <div className="h-80 w-full rounded-md border border-border flex items-center justify-center text-sm text-muted-foreground">
        No chart data
      </div>
    );
  }

  const tooltipBg =
    theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";

  const tz = data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatY = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);

  return (
    <div className="h-80 w-full  text-foreground" aria-live="polite">
      <ResponsiveContainer width="100%" height="100%" onResize={(w) => setWidth(w)}>
        <AreaChart
          data={series}
          margin={{ top: 20, right: 10, bottom: 24, left: 10 }}
        >
          <defs>
            {/* visible line/fill in dark mode */}
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.06} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke={gridColor}
            strokeDasharray="3 3"
            opacity={0.25}
            vertical={false}
          />

          <XAxis
            dataKey="ts"
            ticks={ticks}
            tickFormatter={(v, i) =>
              formatTick(rk, new Date(v), i > 0 ? new Date(ticks[i - 1]) : null, width, tz)
            }
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={{ stroke: axisColor, opacity: 0.35 }}
            tickLine={{ stroke: axisColor, opacity: 0.35 }}
            minTickGap={24}
            tickMargin={8}
            height={44}
            type="number"
            domain={["dataMin", "dataMax"]}
          />

          <YAxis
            domain={domain}
            ticks={yTicks}
            tickFormatter={formatY}
            tick={{ fill: tickColor, fontSize: 12 }}
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
            labelFormatter={(v) => formatTooltip(new Date(v), rk, tz)}
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
              x={last.ts}
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
