"use client";
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
} from "recharts";

export default function PredictionChart({ data }) {
  const { theme } = useTheme();
  const axisColor = theme === "dark" ? "#fff" : "hsl(var(--foreground))";
  const tooltipBg = theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";

  const series = (data || []).filter((d) => d.part !== "context");

  const prices = series
    .flatMap((d) => [d.actual, d.pred])
    .filter((v) => Number.isFinite(v));
  const max = prices.length ? Math.max(...prices) : 0;
  const step = max >= 1000 ? 1000 : 100;
  const maxRounded = Math.ceil(max / step) * step || step;
  const yTicks = Array.from({ length: 4 }, (_, i) => ((i + 1) * maxRounded) / 4);

  const dates = series.map((d) => d.date);
  const xTicks = (() => {
    if (dates.length === 0) return [];
    const tickCount = Math.min(8, dates.length);
    return Array.from({ length: tickCount }, (_, i) => {
      const idx = Math.floor((dates.length - 1) * (i / (tickCount - 1)));
      return dates[idx];
    });
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
            Predicted: {row.pred !== undefined ? fmtCurrency(row.pred) : "N/A"}
          </div>
          <div>
            Actual: {row.actual !== undefined ? fmtCurrency(row.actual) : "N/A"}
          </div>
          <div>
            Accuracy: {row.accuracy != null ? `${row.accuracy.toFixed(1)}%` : "N/A"}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={series} margin={{ top: 24, right: 24, bottom: 80, left: 48 }}>
        <CartesianGrid strokeOpacity={0.12} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          ticks={xTicks}
          tick={{ fill: axisColor }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          domain={[0, maxRounded]}
          ticks={yTicks}
          tick={{ fill: axisColor }}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip content={renderTooltip} />
        <Legend />
        <Line
          dataKey="actual"
          name="Actual"
          stroke="#2563eb"
          dot={false}
          strokeWidth={2}
        />
        <Line
          dataKey="pred"
          name="Predicted"
          stroke="#f97316"
          dot={false}
          activeDot={{ r: 5 }}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
