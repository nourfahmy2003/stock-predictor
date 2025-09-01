"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useReducedMotion } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";

function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min || 0, (max || 0) + 1];
  const span = max - min;
  const mag = Math.pow(10, Math.floor(Math.log10(span / Math.max(1, count - 1))));
  const nrm = (span / Math.max(1, count - 1)) / mag;
  const base = nrm < 1.5 ? 1 : nrm < 3 ? 2 : nrm < 7 ? 5 : 10;
  const step = base * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(12));
  return ticks;
}

export default function PredictionChart({ data }) {
  // hooks (fixed order)
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const isSmall = width < 640;

  const series = useMemo(() => (
    (data || [])
      .filter((d) => d.part !== "context")
      .map((d) => ({ ...d, ts: new Date(d.date).getTime() }))
      .filter((d) => Number.isFinite(d.ts))
  ), [data]);

  const yInfo = useMemo(() => {
    const vals = series.flatMap((d) => [d.actual, d.pred]).filter(Number.isFinite);
    if (!vals.length) return { yMin: 0, yMax: 1, yTicks: [0, 1] };
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min || 1) * 0.08;
    const ticks = niceTicks(Math.max(0, min - pad), max + pad, height <= 360 ? 4 : height <= 560 ? 5 : 6);
    return { yMin: ticks[0], yMax: ticks[ticks.length - 1], yTicks: ticks.slice(1) };
  }, [series, height]);
  const { yMin, yMax, yTicks } = yInfo;

  const xTicks = useMemo(() => {
    if (!series.length) return [];
    const a = series[0].ts, b = series[series.length - 1].ts;
    const n = 6, step = (b - a) / (n - 1 || 1);
    return Array.from({ length: n }, (_, i) => Math.round(a + i * step));
  }, [series]);

  const root = useMemo(
    () => (typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null),
    []
  );
  const axisColor = root?.getPropertyValue("--muted-foreground")?.trim() || (resolvedTheme === "dark" ? "#bbb" : "#555");
  const gridColor = root?.getPropertyValue("--border")?.trim() || (resolvedTheme === "dark" ? "#333" : "#ccc");
  const tooltipBg = root?.getPropertyValue("--card")?.trim() || (resolvedTheme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)");
  const dtf = useMemo(() => new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }), []);

  const forecastStartTs = useMemo(() => series.find((d) => d.part === "forecast")?.ts, [series]);
  const lineWidth = isSmall ? 2.5 : 3;
  const fontSize  = isSmall ? 10 : 12;
  const fmtCurrency = (v) => (Number.isFinite(v) ? `$${v.toFixed(2)}` : "N/A");

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
      axisG.style.pointerEvents = "none"; // not clickable/hoverable
      axisG.style.userSelect = "none";
    });
  }, []);
  useEffect(() => { translateYAxis(); }, [translateYAxis, width, height, yMin, yMax, resolvedTheme]);

  if (!mounted) {
    return <div className="h-[320px] w-full rounded-2xl bg-card animate-pulse" />;
  }

  return (
    <div className="w-full bg-card rounded-2xl p-4 sm:p-6">
      <div
        ref={wrapperRef}
        className="sm:overflow-visible overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ WebkitOverflowScrolling: "touch" }}
        onScroll={translateYAxis}
      >
        <div className="min-w-[720px] sm:min-w-0">
          <div className="min-h-[280px] h-[60vh] max-h-[520px]">
            <ResponsiveContainer width="100%" height="100%" onResize={(w,h)=>{setWidth(w);setHeight(h);}}>
              <LineChart data={series} margin={{ left: 40, right: 20, top: 56, bottom: isSmall ? 60 : 64 }}>
                <CartesianGrid strokeOpacity={0.1} stroke={gridColor} />
                <XAxis
                  dataKey="ts" type="number" domain={["dataMin","dataMax"]} scale="time"
                  ticks={xTicks} tick={{ fill: axisColor, fontSize }}
                  tickFormatter={(ts)=>dtf.format(new Date(ts))}
                  angle={-35} textAnchor="end" height={isSmall?76:80}
                  label={{ value:"Date", position:"insideBottomRight", offset:-10, fill:axisColor, fontSize }}
                />
                <YAxis
                  domain={[yMin,yMax]} ticks={yTicks} tick={{ fill:axisColor, fontSize }}
                  tickFormatter={(v)=>`$${Math.round(v)}`}
                  label={{ value:"Price (USD)", angle:-90, position:"insideLeft", offset:-6, fill:axisColor, fontSize }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border:"1px solid hsl(var(--border))", padding:"0.5rem", borderRadius:6 }}
                  formatter={(value, name, ctx)=>{
                    const row = ctx?.payload;
                    return [name==="actual"?fmtCurrency(row.actual):fmtCurrency(row.pred), name==="actual"?"Actual":"Predicted"];
                  }}
                  labelFormatter={(ts)=>dtf.format(new Date(ts))}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 8, fontSize }} />
                {forecastStartTs && (
                  <ReferenceLine x={forecastStartTs} stroke={axisColor} strokeDasharray="3 3"
                    label={{ value:"Forecast starts", position:"top", fill:axisColor, fontSize }} />
                )}
                <Line dataKey="actual" name="Actual" stroke="#2563eb" dot={false} strokeWidth={lineWidth} isAnimationActive={!reduceMotion} />
                <Line dataKey="pred"   name="Predicted" stroke="#f97316" dot={false} strokeDasharray="4 2" strokeWidth={lineWidth} isAnimationActive={!reduceMotion} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
