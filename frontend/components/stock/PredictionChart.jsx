"use client";
import { useTheme } from "next-themes";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function PredictionChart({ data }) {
  const { theme } = useTheme();
  const axisColor = theme === "dark" ? "#fff" : "hsl(var(--foreground))";
  const tooltipBg = theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";

  // Compute Y domain with a small pad
  const prices = (data || []).flatMap(d => [d.actual, d.pred]).filter(v => Number.isFinite(v));
  const lo = prices.length ? Math.min(...prices) : 0;
  const hi = prices.length ? Math.max(...prices) : 1;
  const pad = Math.max((hi - lo) * 0.02, 0.5);
  const domain = [lo - pad, hi + pad];

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data || []} margin={{ top: 24, right: 24, bottom: 24, left: 48 }}>
        <CartesianGrid strokeOpacity={0.12} stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fill: axisColor }} interval="preserveStartEnd" />
        <YAxis domain={domain} tick={{ fill: axisColor }} />
        <Tooltip
          contentStyle={{ backgroundColor: tooltipBg, border: "1px solid hsl(var(--border))" }}
          formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === "actual" ? "Actual" : "Predicted"]}
        />
        {/* actual */}
        <Line dataKey="actual" stroke="hsl(var(--chart-line, var(--primary)))" dot={false} strokeWidth={2} />
        {/* predicted */}
        <Line dataKey="pred" stroke="#f97316" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
