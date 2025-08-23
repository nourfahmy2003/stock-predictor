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

  const prices = (data || [])
    .flatMap((d) => [d.actual, d.pred])
    .filter((v) => Number.isFinite(v));
  const max = prices.length ? Math.max(...prices) : 0;
  const step = max >= 1000 ? 1000 : 100;
  const maxRounded = Math.ceil(max / step) * step || step;
  const yTicks = Array.from({ length: 4 }, (_, i) => ((i + 1) * maxRounded) / 4);

  const dates = (data || []).map((d) => d.date);
  const xTicks = (() => {
    if (dates.length === 0) return [];
    const ticks = [];
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    const dt = new Date(start);
    dt.setDate(1);
    while (dt <= end) {
      ticks.push(dt.toISOString().slice(0, 10));
      dt.setMonth(dt.getMonth() + 4);
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
      <LineChart data={data || []} margin={{ top: 24, right: 24, bottom: 80, left: 48 }}>
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
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
