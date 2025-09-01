"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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

const OPTION_CONFIG = {
  "1m": { range: "1d",  interval: "1m",  rangeKey: "1m",  liveMs: 60_000 },
  "5m": { range: "5d",  interval: "5m",  rangeKey: "5m",  liveMs: 5 * 60_000 },
  "1H": { range: "1mo", interval: "1h",  rangeKey: "1d",  liveMs: 60 * 60_000 },
  "1D": { range: "1y",  interval: "1d",  rangeKey: "1y",  liveMs: 24 * 60 * 60_000 },
  "3M": { range: "3mo", interval: "1d",  rangeKey: "3mo", liveMs: 24 * 60 * 60_000 },
  "1Y": { range: "1y",  interval: "1d",  rangeKey: "1y",  liveMs: 24 * 60 * 60_000 },
  "5Y": { range: "5y",  interval: "1wk", rangeKey: "5y",  liveMs: 7 * 24 * 60 * 60_000 },
};
const OPTIONS = Object.keys(OPTION_CONFIG);

const ticksForWidth = (w) => (w <= 480 ? 5 : w <= 1024 ? 6 : 8);
const ticksForHeight = (h) => (h <= 360 ? 4 : h <= 560 ? 5 : 6);

function niceStep(rough) {
  const p = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const n = rough / p;
  const base = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return base * p;
}
function buildFixedTicks(min, max, count) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    const v = Number.isFinite(min) ? min : 0;
    return Array.from({ length: count }, (_, i) => v + i);
  }
  const span = max - min;
  const step = niceStep(span / (count - 1));
  let lo = Math.floor(min / step) * step;
  let hi = lo + step * (count - 1);
  if (hi < max) { lo += Math.ceil((max - hi) / step) * step; hi = lo + step * (count - 1); }
  if (lo > min) { lo -= Math.ceil((lo - min) / step) * step; hi = lo + step * (count - 1); }
  return Array.from({ length: count }, (_, i) => +((lo + i * step).toFixed(12)));
}

// ---- UTC helpers + tick builders ----
const firstOfMonthUTC = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonthsUTC  = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const janFirstUTC   = (y)   => new Date(Date.UTC(y, 0, 1));
const monthsBetween = (a, b) =>
  (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
const evenTicks = (minTs, maxTs, desired) => {
  if (desired <= 1 || minTs >= maxTs) return [minTs, maxTs];
  const step = (maxTs - minTs) / (desired - 1);
  return Array.from({ length: desired }, (_, i) => Math.round(minTs + i * step));
};
function monthlyTicks(startTs, endTs, desired) {
  let start = firstOfMonthUTC(new Date(startTs));
  if (start.getTime() < startTs) start = addMonthsUTC(start, 1);
  const end = new Date(endTs);
  const totalMonths = Math.max(1, monthsBetween(start, end) + 1);
  const step = Math.max(1, Math.round(totalMonths / (desired - 1)));
  const ticks = [];
  for (let i = 0; i < desired; i++) {
    const ts = addMonthsUTC(start, i * step).getTime();
    ticks.push(ts > endTs ? endTs : ts);
  }
  return [...new Set(ticks)].slice(0, desired);
}
function yearlyTicks(startTs, endTs, desired) {
  const startYear = new Date(startTs).getUTCFullYear();
  let first = janFirstUTC(startYear);
  if (first.getTime() < startTs) first = janFirstUTC(startYear + 1);
  const endYear = new Date(endTs).getUTCFullYear();
  const totalYears = Math.max(1, endYear - first.getUTCFullYear() + 1);
  const step = Math.max(1, Math.round(totalYears / (desired - 1)));
  const ticks = [];
  for (let i = 0; i < desired; i++) {
    const ts = janFirstUTC(first.getUTCFullYear() + i * step).getTime();
    ticks.push(ts > endTs ? endTs : ts);
  }
  return [...new Set(ticks)].slice(0, desired);
}

const widthTooTight = (w) => w < 600;
const formatDate = (d, opts, tz) => new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(d);
const getMonth = (d, tz) => parseInt(formatDate(d, { month: "numeric" }, tz));
const getYear  = (d, tz) => parseInt(formatDate(d, { year: "numeric" }, tz));
const yearChanged = (d, prev, tz) => prev && getYear(d, tz) !== getYear(prev, tz);
const isJan = (d, tz) => getMonth(d, tz) === 1;

function formatTick(rangeKey, d, prev, width, tz) {
  switch (rangeKey) {
    case "1m":
    case "5m": return formatDate(d, { hour: "numeric", minute: "2-digit" }, tz);
    case "1d": return formatDate(d, { hour: "numeric" }, tz).replace(" ", "");
    case "1mo": return `${formatDate(d, { month: "short" }, tz)} ${formatDate(d, { day: "numeric" }, tz)}`;
    case "3mo": return widthTooTight(width) ? formatDate(d, { month: "short" }, tz)
                                            : `${formatDate(d, { month: "short" }, tz)} ${formatDate(d, { day: "numeric" }, tz)}`;
    case "1y": return isJan(d, tz) && yearChanged(d, prev, tz)
                        ? `${formatDate(d, { month: "short" }, tz)} ’${formatDate(d, { year: "2-digit" }, tz)}`
                        : formatDate(d, { month: "short" }, tz);
    case "5y": return formatDate(d, { year: "numeric" }, tz);
    default:   return formatDate(d, { month: "short", day: "numeric" }, tz);
  }
}
function formatTooltip(d, rangeKey, tz) {
  const tzAbbr = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(d).find((p) => p.type === "timeZoneName")?.value;
  if (rangeKey === "1m" || rangeKey === "5m" || rangeKey === "1d") {
    return `${formatDate(d, { weekday: "short" }, tz)}, ${formatDate(d, { month: "short" }, tz)} ${formatDate(d, { day: "numeric" }, tz)} • ${formatDate(d, { hour: "numeric", minute: "2-digit" }, tz)} ${tzAbbr}`;
  }
  return `${formatDate(d, { weekday: "short" }, tz)}, ${formatDate(d, { month: "short" }, tz)} ${formatDate(d, { day: "numeric" }, tz)}, ${formatDate(d, { year: "numeric" }, tz)}`;
}
function generateTicks(rangeKey, series, width) {
  if (!series.length) return [];
  const desired = ticksForWidth(width);
  const startTs = series[0].ts;
  const endTs = series[series.length - 1].ts;
  switch (rangeKey) {
    case "1y":  return monthlyTicks(startTs, endTs, desired);
    case "5y":  return yearlyTicks(startTs, endTs, desired);
    case "3mo": return evenTicks(startTs, endTs, desired);
    default:    return evenTicks(startTs, endTs, desired);
  }
}

export default function PriceChart({ ticker, refreshMs = 30_000 }) {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  // Hooks (stable order)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [option, setOption] = useState("1D");
  const config = OPTION_CONFIG[option];

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handle = () => setVisible(!document.hidden);
    handle(); document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []);

  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/chart/${ticker}?range=${config.range}&interval=${config.interval}` : null,
    fetcher, { dedupingInterval: refreshMs, refreshInterval: visible ? refreshMs : 0, keepPreviousData: true }
  );
  useEffect(() => { if (visible) mutate(); }, [visible, mutate]);

  const [lastUpdated, setLastUpdated] = useState(null);
  useEffect(() => { if (data) setLastUpdated(new Date()); }, [data]);

  const [paneW, setPaneW] = useState(0);
  const [paneH, setPaneH] = useState(0);
  const isSmall = paneW < 640;

  const root = mounted ? getComputedStyle(document.documentElement) : null;
  const axisColor = root?.getPropertyValue("--muted-foreground")?.trim() || (resolvedTheme === "dark" ? "#bbb" : "#555");
  const tickColor = root?.getPropertyValue("--foreground")?.trim() || (resolvedTheme === "dark" ? "#fff" : "#111");
  const gridColor = root?.getPropertyValue("--border")?.trim() || (resolvedTheme === "dark" ? "#333" : "#ddd");
  const tooltipBg = root?.getPropertyValue("--card")?.trim() || (resolvedTheme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)");

  const series = useMemo(() => (data?.series || []).map((p) => ({ ...p, ts: new Date(p.date).getTime() })), [data]);

  const rk = config.rangeKey;
  const xTicks = useMemo(() => {
    if (!series.length) return [];
    const desired = ticksForWidth(paneW);
    const startTs = series[0].ts;
    const endTs = series[series.length - 1].ts;
    switch (rk) {
      case "1y":  return monthlyTicks(startTs, endTs, desired);
      case "5y":  return yearlyTicks(startTs, endTs, desired);
      case "3mo": return evenTicks(startTs, endTs, desired);
      default:    return evenTicks(startTs, endTs, desired);
    }
  }, [rk, series, paneW]);

  const { prices, domain, yTicks, last, formatY } = useMemo(() => {
    const prices = series.map((p) => p.close);
    if (prices.length === 0) {
      const ticks = [0, 0.25, 0.5, 0.75, 1];
      return { prices, domain: [ticks[0], ticks[ticks.length - 1]], yTicks: ticks, last: null, formatY: (v) => v };
    }
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min || 1) * 0.06;
    const lo = Math.max(0, min - pad);
    const hi = max + pad;
    const count = ticksForHeight(paneH);
    const ticks = buildFixedTicks(lo, hi, count);
    const domain = [ticks[0], ticks[ticks.length - 1]];
    const step = ticks[1] - ticks[0];
    const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    const formatter = (v) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
    const last = series[series.length - 1] || null;
    return { prices, domain, yTicks: ticks, last, formatY: formatter };
  }, [series, paneH]);

  const isLive = last ? Date.now() - last.ts < config.liveMs : false;
  const tz = data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmtUpdated = lastUpdated ? formatDate(lastUpdated, { hour: "2-digit", minute: "2-digit", second: "2-digit" }, tz) : "--";

  const MARGINS = useMemo(() => ({ top: 22, right: 32, bottom: isSmall ? 60 : 42, left: 36 }), [isSmall]);

  // --- Sticky Y-axis (no backdrop, not clickable) ---
  const wrapperRef = useRef(null);
  const translateYAxis = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const axisList = wrapper.querySelectorAll(".recharts-yAxis");
    if (!axisList?.length) return;

    const surface = wrapper.querySelector(".recharts-surface");
    const scrollLeft = wrapper.scrollLeft;
    const surfaceW = surface?.clientWidth || 0;
    const wrapperW = wrapper.clientWidth;

    axisList.forEach((axisG) => {
      const tickLine = axisG.querySelector(".recharts-cartesian-axis-tick-line");
      const orientation = tickLine?.getAttribute("orientation") || "left";
      const pos = orientation === "left"
        ? scrollLeft
        : scrollLeft - surfaceW + wrapperW;

      axisG.style.transform = `translateX(${pos}px)`;
      axisG.style.willChange = "transform";
      axisG.style.pointerEvents = "none"; // <-- not clickable/hoverable
      // also prevent text selection cursor
      axisG.style.userSelect = "none";
    });
  }, []);
  useEffect(() => { translateYAxis(); }, [translateYAxis, paneW, paneH, domain, yTicks, option, resolvedTheme]);

  // Renders
  if (!mounted) return <div className="h-[320px] w-full rounded-2xl border border-border bg-card animate-pulse" />;
  if (isLoading) return <div className="h-[320px] w-full rounded-2xl border border-border bg-muted animate-pulse" aria-busy="true" />;
  if (error) {
    return (
      <div className="h-80 w-full rounded-2xl border border-border bg-card flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground" role="alert">
        <p>Failed to load price data.</p>
        <button onClick={() => mutate()} className="px-2 py-1 text-xs border border-border rounded-md">Retry</button>
      </div>
    );
  }
  if (prices.length === 0) {
    return <div className="h-80 w-full rounded-2xl border border-border bg-card flex items-center justify-center text-sm text-muted-foreground">No chart data</div>;
  }

  return (
    <div className="w-full text-foreground bg-card border border-border rounded-2xl p-4 sm:p-6" aria-live="polite">
      <div className="-mx-2 sm:mx-0 px-2 sm:px-0 mb-2">
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setOption(opt)}
              className={`w-full sm:w-auto px-3 py-2 rounded-md border min-h-[40px] text-sm ${
                option === opt ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 justify-end">
          {isLive && <span className="px-1 py-0.5 text-[10px] bg-red-500 text-white rounded">LIVE</span>}
          <span className="text-xs text-muted-foreground">Updated {fmtUpdated}</span>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="sm:overflow-visible overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ WebkitOverflowScrolling: "touch" }}
        onWheel={(e) => {
          if (window.innerWidth < 640 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
            e.currentTarget.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}
        onScroll={translateYAxis}
      >
        <div className="min-w-[720px] sm:min-w-0">
          <div className="min-h-[280px] h-[40vh] max-h=[520px]">
            <ResponsiveContainer width="100%" height="100%" onResize={(w, h) => { setPaneW(w); setPaneH(h); }}>
              <AreaChart data={series} margin={MARGINS}>
                <defs>
                  <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.06} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke={gridColor} strokeOpacity={0.12} vertical={false} />

                <XAxis
                  dataKey="ts"
                  ticks={xTicks}
                  tickFormatter={(v, i) =>
                    formatTick(rk, new Date(v), i > 0 ? new Date(xTicks[i - 1]) : null, paneW, tz)
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
                  contentStyle={{ backgroundColor: tooltipBg, border: "1px solid hsl(var(--border))", borderRadius: 6, color: "hsl(var(--foreground))", padding: "0.5rem" }}
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
  );
}
