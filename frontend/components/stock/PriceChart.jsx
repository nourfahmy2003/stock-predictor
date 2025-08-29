"use client";

import { useState, useMemo, useEffect } from "react";
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
  // for intraday ranges show only top-of-hour labels
  '1m': { step: { hours: 1 } },
  '5m': { step: { hours: 1 } },
  '1d': { step: { hours: 1 } },
  '1mo': { step: { weeks: 1 } },
  '3mo': { step: { weeks: 2 } },
  '1y': { step: { months: 1 } },
  '5y': { step: { years: 1 } },
};

const OPTION_CONFIG = {
  '1m': { range: '1d', interval: '1m', rangeKey: '1m', liveMs: 60_000 },
  '5m': { range: '5d', interval: '5m', rangeKey: '5m', liveMs: 5 * 60_000 },
  '1H': { range: '1mo', interval: '1h', rangeKey: '1d', liveMs: 60 * 60_000 },
  '1D': { range: '1y', interval: '1d', rangeKey: '1y', liveMs: 24 * 60 * 60_000 },
  '3M': { range: '3mo', interval: '1d', rangeKey: '3mo', liveMs: 24 * 60 * 60_000 },
  '1Y': { range: '1y', interval: '1d', rangeKey: '1y', liveMs: 24 * 60 * 60_000 },
  '5Y': { range: '5y', interval: '1wk', rangeKey: '5y', liveMs: 7 * 24 * 60 * 60_000 },
};

const OPTIONS = Object.keys(OPTION_CONFIG);

// target a reasonable number of x ticks depending on chart width
const ticksForWidth = (w) => {
  if (w <= 480) return 5; // ~4–5 ticks
  if (w <= 1024) return 6; // ~5–6 ticks
  return 8; // wide screens can show up to 8 ticks
};

// target y-axis ticks based on chart height
const ticksForHeight = (h) => {
  if (h <= 360) return 5;
  if (h <= 560) return 6;
  return 8;
};

// allowed step candidates for y-axis ticks
const STEP_CANDIDATES = [
  0.01,
  0.02,
  0.05,
  0.1,
  0.2,
  0.25,
  0.5,
  1,
  2,
  2.5,
  5,
  10,
  20,
  25,
  50,
];

function pickStep(rough) {
  for (const c of STEP_CANDIDATES) {
    if (c >= rough) return c;
  }
  return STEP_CANDIDATES[STEP_CANDIDATES.length - 1];
}

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

export default function PriceChart({ ticker, refreshMs = 30_000 }) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme(); // <—
  const isDark = resolvedTheme === "dark"; // <—
  const axisColor = isDark ? "#ffffff" : "hsl(var(--muted-foreground))";
  const tickColor = isDark ? "#ffffff" : "hsl(var(--foreground))";
  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "hsl(var(--border))";

  const [option, setOption] = useState("1D");
  const config = OPTION_CONFIG[option];

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handle = () => setVisible(!document.hidden);
    handle();
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []);

  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/chart/${ticker}?range=${config.range}&interval=${config.interval}` : null,
    fetcher,
    {
      dedupingInterval: refreshMs,
      refreshInterval: visible ? refreshMs : 0,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    if (visible) mutate();
  }, [visible, mutate]);

  const [lastUpdated, setLastUpdated] = useState(null);
  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const series = useMemo(
    () => (data?.series || []).map((p) => ({ ...p, ts: new Date(p.date).getTime() })),
    [data]
  );
  const rk = config.rangeKey;
  const ticks = useMemo(() => generateTicks(rk, series, width), [rk, series, width]);

  const { prices, domain, yTicks, last, formatY } = useMemo(() => {
    const prices = series.map((p) => p.close);
    if (prices.length === 0) {
      return {
        prices,
        domain: [0, 1],
        yTicks: [],
        last: null,
        formatY: (v) => v,
      };
    }
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    let yMin = Math.max(0, min - range * 0.04);
    let yMax = max + range * 0.08;
    const desired = ticksForHeight(height);
    const step = pickStep((yMax - yMin) / desired);
    yMin = Math.floor(yMin / step) * step;
    yMax = Math.ceil(yMax / step) * step;
    const ticks = [];
    for (let v = yMin; v <= yMax + step / 2; v += step) {
      ticks.push(Number(v.toFixed(10)));
    }
    const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    const formatter = (v) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(v);
    const last = series[series.length - 1];
    return { prices, domain: [yMin, yMax], yTicks: ticks, last, formatY: formatter };
  }, [series, height]);

  const isLive = last ? Date.now() - last.ts < config.liveMs : false;

  const tz = data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmtUpdated = lastUpdated
    ? formatDate(lastUpdated, { hour: '2-digit', minute: '2-digit', second: '2-digit' }, tz)
    : '--';

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

  return (
    <div className="h-80 w-full  text-foreground" aria-live="polite">
      <div className="flex items-center justify-end gap-2 mb-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setOption(opt)}
            className={`px-2 py-1 text-xs rounded-md border border-border ${
              option === opt
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
        {isLive && (
          <span className="px-1 py-0.5 text-[10px] bg-red-500 text-white rounded">LIVE</span>
        )}
        <span className="text-xs text-muted-foreground">Updated {fmtUpdated}</span>
      </div>
      <ResponsiveContainer
        width="100%"
        height="100%"
        onResize={(w, h) => {
          setWidth(w);
          setHeight(h);
        }}
      >
        <AreaChart
          data={series}
          margin={{ top: 22, right: 32, bottom: 42, left: 36 }}
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
            strokeOpacity={0.12}
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
