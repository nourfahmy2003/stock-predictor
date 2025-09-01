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
// exact target # of Y ticks based on height
const ticksForHeight = (h) => {
  if (h <= 360) return 4;  // small
  if (h <= 560) return 5;  // medium
  return 6;                // large
};

// choose a "nice" step close to desired
function niceStep(rough) {
  const p = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const n = rough / p;
  const base = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return base * p;
}

/** Build exactly `count` ticks with equal spacing, covering [min,max] */
function buildFixedTicks(min, max, count) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    const v = Number.isFinite(min) ? min : 0;
    return Array.from({ length: count }, (_, i) => v + i); // trivial fallback
  }
  const span = max - min;
  const rough = span / (count - 1);
  const step = niceStep(rough);

  // First attempt: snap min down to step, then compute top
  let lo = Math.floor(min / step) * step;
  let hi = lo + step * (count - 1);

  // If we clipped above max, shift the window up to include it
  if (hi < max) {
    const needed = Math.ceil((max - hi) / step);
    lo += needed * step;
    hi = lo + step * (count - 1);
  }

  // If shifting pushed lo above min, shift back down while still covering min
  if (lo > min) {
    const back = Math.ceil((lo - min) / step);
    lo -= back * step;
    hi = lo + step * (count - 1);
  }

  // Generate ticks
  const ticks = [];
  for (let i = 0; i < count; i++) ticks.push(+((lo + i * step).toFixed(12)));
  return ticks;
}


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

// ---- UTC-safe builders ----
const firstOfMonthUTC = (d) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonthsUTC = (d, n) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const janFirstUTC = (year) => new Date(Date.UTC(year, 0, 1));

const monthsBetween = (a, b) =>
  (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
  (b.getUTCMonth() - a.getUTCMonth());
// exactly N equally spaced timestamps between [min,max]
function evenTicks(minTs, maxTs, desired) {
  if (desired <= 1 || minTs >= maxTs) return [minTs, maxTs];
  const span = maxTs - minTs;
  const step = span / (desired - 1);
  return Array.from({ length: desired }, (_, i) => Math.round(minTs + i * step));
}

// months: fixed step in whole months from the first full month ≥ start
function monthlyTicks(startTs, endTs, desired) {
  let start = firstOfMonthUTC(new Date(startTs));
  if (start.getTime() < startTs) start = addMonthsUTC(start, 1);

  const end = new Date(endTs);
  const totalMonths = Math.max(1, monthsBetween(start, end) + 1); // inclusive
  const step = Math.max(1, Math.round(totalMonths / (desired - 1))); // fixed month step

  const ticks = [];
  for (let i = 0; i < desired; i++) {
    const t = addMonthsUTC(start, i * step);
    const ts = t.getTime();
    if (ts > endTs) {
      // if we overshoot, clamp last tick to endTs
      ticks.push(endTs);
      break;
    }
    ticks.push(ts);
  }
  // ensure strictly increasing & unique
  return [...new Set(ticks)].slice(0, desired);
}

// years: Jan 1 every fixed number of years
function yearlyTicks(startTs, endTs, desired) {
  const startYear = new Date(startTs).getUTCFullYear();
  const endYear = new Date(endTs).getUTCFullYear();

  let first = janFirstUTC(startYear);
  if (first.getTime() < startTs) first = janFirstUTC(startYear + 1);

  const totalYears = Math.max(1, endYear - first.getUTCFullYear() + 1);
  const step = Math.max(1, Math.round(totalYears / (desired - 1)));

  const ticks = [];
  for (let i = 0; i < desired; i++) {
    const y = first.getUTCFullYear() + i * step;
    const t = janFirstUTC(y);
    const ts = t.getTime();
    if (ts > endTs) {
      ticks.push(endTs);
      break;
    }
    ticks.push(ts);
  }
  return [...new Set(ticks)].slice(0, desired);
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
  if (!series.length) return [];
  const desired = ticksForWidth(width);
  const startTs = series[0].ts;
  const endTs = series[series.length - 1].ts;

  switch (rangeKey) {
    case "1y":   // your “1D” button maps to rangeKey '1y'
      return monthlyTicks(startTs, endTs, desired);
    case "5y":
      return yearlyTicks(startTs, endTs, desired);
    case "3mo": {
      // exactly N evenly spaced timestamps from start..end
      return evenTicks(startTs, endTs, desired);
    }

    // intraday & 1mo: even spacing over time (looks best for dense data)
    case "1m":
    case "5m":
    case "1d":
    case "1mo":
    default:
      return evenTicks(startTs, endTs, desired);
  }
}


export default function PriceChart({ ticker, refreshMs = 30_000 }) {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
  const isSmall = width < 640;

  const root = mounted ? getComputedStyle(document.documentElement) : null;
  const axisColor = root?.getPropertyValue("--muted-foreground")?.trim() || (resolvedTheme === "dark" ? "#fff" : "#000");
  const tickColor = root?.getPropertyValue("--foreground")?.trim() || (resolvedTheme === "dark" ? "#fff" : "#000");
  const gridColor = root?.getPropertyValue("--border")?.trim() || (resolvedTheme === "dark" ? "#333" : "#ddd");
  const tooltipBg =
    root?.getPropertyValue("--card")?.trim() ||
    (resolvedTheme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)");

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
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        last: null,
        formatY: (v) => v,
      };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    // small padding so lines don’t hug edges
    const pad = (max - min || 1) * 0.06;
    const lo = Math.max(0, min - pad);
    const hi = max + pad;

    const count = ticksForHeight(height); // 4 / 5 / 6 (fixed)
    const ticks = buildFixedTicks(lo, hi, count);
    const domain = [ticks[0], ticks[ticks.length - 1]];

    // currency decimals based on step size
    const step = ticks[1] - ticks[0];
    const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;

    const formatter = (v) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(v);

    const last = series[series.length - 1];
    return { prices, domain, yTicks: ticks, last, formatY: formatter };
  }, [series, height]);

  const isLive = last ? Date.now() - last.ts < config.liveMs : false;

  const tz = data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmtUpdated = lastUpdated
    ? formatDate(lastUpdated, { hour: '2-digit', minute: '2-digit', second: '2-digit' }, tz)
    : '--';

  if (!mounted) {
    return <div className="h-[320px] w-full rounded-md border border-border animate-pulse" />;
  }

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

  return (
    <div className="w-full text-foreground" aria-live="polite">
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-2">
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setOption(opt)}
              className={`w-full sm:w-auto px-3 py-2 rounded-md border min-h-[40px] text-sm ${option === opt
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground"
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 justify-end">
          {isLive && (
            <span className="px-1 py-0.5 text-[10px] bg-red-500 text-white rounded">LIVE</span>
          )}
          <span className="text-xs text-muted-foreground">Updated {fmtUpdated}</span>
        </div>
      </div>
      <div className="relative">
        <div
          className="sm:overflow-visible overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none]"
          onWheel={(e) => {
            if (window.innerWidth < 640 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
              e.currentTarget.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
        >
          <div className="min-w-[720px] sm:min-w-0 pr-2">
            <div style={{ height: "60vh", maxHeight: 520, minHeight: 320 }}>
              <ResponsiveContainer
                width="100%"
                height="100%"
                onResize={(w, h) => {
                  setWidth(w);
                  setHeight(h);
                }}
              >
                <AreaChart data={series} margin={{ top: 22, right: 32, bottom: 42, left: 36 }}>
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke={gridColor} strokeOpacity={0.12} vertical={false} />

                  <XAxis
                    dataKey="ts"
                    ticks={ticks}
                    tickFormatter={(v, i) =>
                      formatTick(rk, new Date(v), i > 0 ? new Date(ticks[i - 1]) : null, width, tz)
                    }
                    tick={{ fill: tickColor, fontSize: isSmall ? 10 : 12 }}
                    axisLine={{ stroke: axisColor, opacity: 0.35 }}
                    tickLine={{ stroke: axisColor, opacity: 0.35 }}
                    minTickGap={24}
                    tickMargin={8}
                    height={isSmall ? 64 : 44}
                    angle={isSmall ? -35 : 0}
                    textAnchor={isSmall ? "end" : "middle"}
                    type="number"
                    domain={["dataMin", "dataMax"]}
                  />

                  <YAxis
                    domain={domain}
                    ticks={yTicks}
                    tickFormatter={formatY}
                    tick={{ fill: tickColor, fontSize: isSmall ? 10 : 12 }}
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
                    stroke="#60a5fa"
                    strokeWidth={2}
                    fill="url(#priceFill)"
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
          </div>
        </div>
      </div>
    </div>
  );
}
