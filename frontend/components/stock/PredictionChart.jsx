"use client";
import { useEffect, useState } from "react";
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

export default function PredictionChart({ data }) {
  const { theme } = useTheme();
  const axisColor = theme === "dark" ? "#fff" : "hsl(var(--foreground))";
  const tooltipBg = theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";

  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const handle = () => setIsSmall(window.innerWidth < 640);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const series = (data || []).filter((d) => d.part !== "context");

  const prices = series
    .flatMap((d) => [d.actual, d.pred])
    .filter((v) => Number.isFinite(v));
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const range = max - min;
  const pad = range * 0.1;
  const domainMin = Math.max(0, min - pad);
  const step = max >= 1000 ? 1000 : 100;
  const maxRounded = Math.ceil((max + pad) / step) * step || step;
  const yTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round(domainMin + ((maxRounded - domainMin) / 4) * i)
  );

  const dates = series.map((d) => d.date);
  const xTicks = (() => {
    if (dates.length === 0) return [];
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    const ticks = [dates[0]];
    const tick = new Date(start);
    tick.setMonth(tick.getMonth() + 4);
    while (tick < end) {
      ticks.push(tick.toISOString().slice(0, 10));
      tick.setMonth(tick.getMonth() + 4);
    }
    if (ticks[ticks.length - 1] !== dates[dates.length - 1]) {
      ticks.push(dates[dates.length - 1]);
    }
    return ticks;
  })();

  const fmtCurrency = (v) => `$${v.toFixed(2)}`;

  const renderTooltip = ({ active, payload, label }) => {
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
          <div>Date: {label}</div>
          <div>
            Actual: {row.actual !== undefined ? fmtCurrency(row.actual) : "N/A"}
          </div>
          <div>
            Predicted: {row.pred !== undefined ? fmtCurrency(row.pred) : "N/A"}
          </div>
        </div>
      );
    }
    return null;
  };

  const forecastStart = series.find((d) => d.part === "forecast")?.date;
  const lineWidth = isSmall ? 2.5 : 3;
  const fontSize = isSmall ? 10 : 12;

  return (
    <div style={{ height: "60vh", maxHeight: 520, minHeight: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={series}
          margin={{ left: 40, right: 20, top: 56, bottom: 64 }}
        >
          <CartesianGrid strokeOpacity={0.1} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            ticks={xTicks}
            tick={{ fill: axisColor, fontSize }}
            angle={-45}
            textAnchor="end"
            height={80}
            label={{ value: "Date", position: "insideBottomRight", offset: -10, fill: axisColor, fontSize }}
          />
          <YAxis
            domain={[domainMin, maxRounded]}
            ticks={yTicks.slice(1)}
            tick={{ fill: axisColor, fontSize }}
            tickFormatter={(v) => `$${v}`}
            label={{ value: "Price (USD)", angle: -90, position: "insideLeft", offset: -6, fill: axisColor, fontSize }}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ stroke: axisColor, strokeDasharray: "3 3", strokeOpacity: 0.4 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 8, fontSize }}
          />
          {forecastStart && (
            <ReferenceLine
              x={forecastStart}
              stroke={axisColor}
              strokeDasharray="3 3"
              label={{ value: "Forecast starts", position: "top", fill: axisColor, fontSize }}
            />
          )}
          <Line
            dataKey="actual"
            name="Actual"
            stroke="#2563eb"
            dot={false}
            strokeWidth={lineWidth}
          />
          <Line
            dataKey="pred"
            name="Predicted"
            stroke="#f97316"
            dot={false}
            strokeDasharray="4 2"
            strokeWidth={lineWidth}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

