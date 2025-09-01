"use client";

import { useMemo, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

// Make human-friendly ticks between min..max
function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min || 0, (max || 0) + 1];
  }
  const span = max - min;
  const stepRaw = span / Math.max(1, count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(stepRaw)));
  const norm = stepRaw / mag;
  const niceNorm = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  const step = niceNorm * mag;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + 1e-9; v += step) ticks.push(+v.toFixed(12));
  return ticks;
}

export default function PredictionChart({ data }) {
  const { theme } = useTheme();
  const axisColor = theme === "dark" ? "#fff" : "hsl(var(--foreground))";
  const tooltipBg = theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";

  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const onResize = () => setIsSmall(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Normalize input: add numeric timestamp "ts" for time scale
  const series = useMemo(() => {
    return (data || [])
      .filter((d) => d.part !== "context")
      .map((d) => ({
        ...d,
        ts: new Date(d.date).getTime(),
      }))
      .filter((d) => Number.isFinite(d.ts));
  }, [data]);

  // Y domain & ticks (padded + nice)
  const yInfo = useMemo(() => {
    const prices = series.flatMap((d) => [d.actual, d.pred]).filter(Number.isFinite);
    if (prices.length === 0) return { yMin: 0, yMax: 1, yTicks: [0, 1] };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min || 1) * 0.08;
    const lo = Math.max(0, min - pad);
    const hi = max + pad;
    const ticks = niceTicks(lo, hi, 5);
    return { yMin: ticks[0], yMax: ticks[ticks.length - 1], yTicks: ticks.slice(1) };
  }, [series]);
  const { yMin, yMax, yTicks } = yInfo;

  // X ticks: ~6 evenly spaced dates
  const xTicks = useMemo(() => {
    if (series.length === 0) return [];
    const minTs = series[0].ts;
    const maxTs = series[series.length - 1].ts;
    const n = 6;
    const step = (maxTs - minTs) / (n - 1 || 1);
    return Array.from({ length: n }, (_, i) => Math.round(minTs + i * step));
  }, [series]);

  const dtf = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "2-digit",
      }),
    []
  );

  const fmtCurrency = (v) => (Number.isFinite(v) ? `$${v.toFixed(2)}` : "N/A");

  const renderTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: tooltipBg,
            border: "1px solid hsl(var(--border))",
            padding: "0.5rem",
          }}
        >
          <div>Date: {dtf.format(new Date(row.ts))}</div>
          <div>Actual: {fmtCurrency(row.actual)}</div>
          <div>Predicted: {fmtCurrency(row.pred)}</div>
        </div>
      );
    }
    return null;
  };

  const forecastStartTs = useMemo(() => {
    const f = series.find((d) => d.part === "forecast");
    return f && f.ts;
  }, [series]);

  const lineWidth = isSmall ? 2.5 : 3;
  const fontSize = isSmall ? 10 : 12;

  return (
    <div style={{ height: "60vh", maxHeight: 520, minHeight: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ left: 40, right: 20, top: 56, bottom: 64 }}>
          <CartesianGrid strokeOpacity={0.1} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            ticks={xTicks}
            tick={{ fill: axisColor, fontSize }}
            tickFormatter={(ts) => dtf.format(new Date(ts))}
            angle={-35}
            textAnchor="end"
            height={80}
            label={{
              value: "Date",
              position: "insideBottomRight",
              offset: -10,
              fill: axisColor,
              fontSize,
            }}
          />
          <YAxis
            domain={[yMin, yMax]}
            ticks={yTicks}
            tick={{ fill: axisColor, fontSize }}
            tickFormatter={(v) => `$${Math.round(v)}`}
            label={{
              value: "Price (USD)",
              angle: -90,
              position: "insideLeft",
              offset: -6,
              fill: axisColor,
              fontSize,
            }}
          />
          <Tooltip content={renderTooltip} cursor={{ stroke: axisColor, strokeDasharray: "3 3", strokeOpacity: 0.4 }} />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 8, fontSize }} />
          {forecastStartTs && (
            <ReferenceLine
              x={forecastStartTs}
              stroke={axisColor}
              strokeDasharray="3 3"
              label={{ value: "Forecast starts", position: "top", fill: axisColor, fontSize }}
            />
          )}
          <Line dataKey="actual" name="Actual" stroke="#2563eb" dot={false} strokeWidth={lineWidth} />
          <Line dataKey="pred" name="Predicted" stroke="#f97316" dot={false} strokeDasharray="4 2" strokeWidth={lineWidth} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
