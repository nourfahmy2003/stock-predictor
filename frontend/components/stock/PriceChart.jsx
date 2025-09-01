"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import ChartCard from "@/components/ui/chart-card";
import RangeTabs from "./RangeTabs";
import PriceArea from "./PriceArea";
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
  if (h <= 360) return 4;  // small
  if (h <= 560) return 5;  // medium
  return 6;                // large
};

function niceStep(rough) {
  const p = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const n = rough / p;
  const base = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return base * p;
}

function buildFixedTicks(min, max, count) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    const v = Number.isFinite(min) ? min : 0;
    return Array.from({ length: count }, (_, i) => v + i); // trivial fallback
  }
  const span = max - min;
  const rough = span / (count - 1);
  const step = niceStep(rough);

  let lo = Math.floor(min / step) * step;
  let hi = lo + step * (count - 1);

  if (hi < max) {
    const needed = Math.ceil((max - hi) / step);
    lo += needed * step;
    hi = lo + step * (count - 1);
  }

  if (lo > min) {
    const back = Math.ceil((lo - min) / step);
    lo -= back * step;
    hi = lo + step * (count - 1);
  }

  const ticks = [];
  for (let i = 0; i < count; i++) ticks.push(+((lo + i * step).toFixed(12)));
  return ticks;
}

const STEP_CANDIDATES = [
  0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50,
];

const firstOfMonthUTC = (d) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonthsUTC = (d, n) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const janFirstUTC = (year) => new Date(Date.UTC(year, 0, 1));

const monthsBetween = (a, b) =>
  (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
  (b.getUTCMonth() - a.getUTCMonth());

function evenTicks(minTs, maxTs, desired) {
  if (desired <= 1 || minTs >= maxTs) return [minTs, maxTs];
  const span = maxTs - minTs;
  const step = span / (desired - 1);
  return Array.from({ length: desired }, (_, i) => Math.round(minTs + i * step));
}

function monthlyTicks(startTs, endTs, desired) {
  let start = firstOfMonthUTC(new Date(startTs));
  if (start.getTime() < startTs) start = addMonthsUTC(start, 1);

  const end = new Date(endTs);
  const totalMonths = Math.max(1, monthsBetween(start, end) + 1);
  const step = Math.max(1, Math.round(totalMonths / (desired - 1)));

  const ticks = [];
  for (let i = 0; i < desired; i++) {
    const t = addMonthsUTC(start, i * step);
    const ts = t.getTime();
    if (ts > endTs) {
      ticks.push(endTs);
      break;
    }
    ticks.push(ts);
  }
  return [...new Set(ticks)].slice(0, desired);
}

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
      return width <= 600
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
    case "1y":
      return monthlyTicks(startTs, endTs, desired);
    case "5y":
      return yearlyTicks(startTs, endTs, desired);
    case "3mo":
      return evenTicks(startTs, endTs, desired);
    case "1m":
    case "5m":
    case "1d":
    case "1mo":
    default:
      return evenTicks(startTs, endTs, desired);
  }
}

export default function PriceChart({ ticker, refreshMs = 30_000 }) {
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

  const series = useMemo(
    () => (data?.series || []).map((p) => ({ ...p, ts: new Date(p.date).getTime() })),
    [data]
  );
  const rk = config.rangeKey;

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

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

    const pad = (max - min || 1) * 0.06;
    const lo = Math.max(0, min - pad);
    const hi = max + pad;

    const count = ticksForHeight(height);
    const ticks = buildFixedTicks(lo, hi, count);
    const domain = [ticks[0], ticks[ticks.length - 1]];

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
    <ChartCard
      title="Price Chart"
      tabs={
        <>
          <RangeTabs value={option} onChange={setOption} options={OPTIONS} />
          <div className="mt-2 flex items-center gap-2 justify-end">
            {isLive && (
              <span className="px-1 py-0.5 text-[10px] bg-red-500 text-white rounded">LIVE</span>
            )}
            <span className="text-xs text-muted-foreground">Updated {fmtUpdated}</span>
          </div>
        </>
      }
    >
      <PriceArea
        data={series}
        xTicks={ticks}
        yTicks={yTicks}
        xFmt={(v, i) =>
          formatTick(rk, new Date(v), i > 0 ? new Date(ticks[i - 1]) : null, width, tz)
        }
        yFmt={formatY}
        domain={domain}
        labelFmt={(v) => formatTooltip(new Date(v), rk, tz)}
        onResize={(w, h) => {
          setWidth(w);
          setHeight(h);
        }}
      />
    </ChartCard>
  );
}
