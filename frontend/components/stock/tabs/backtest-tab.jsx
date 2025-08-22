"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { MetricBox } from "@/components/stock/metric-box";
import { ChartWrapper } from "@/components/stock/chart-wrapper";

export function BacktestTab({ ticker }) {
  const { theme } = useTheme();
  const [lookBack, setLookBack] = useState(60);
  const [horizon, setHorizon] = useState(10);
  const [start, setStart] = useState("2020-01-01");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const run = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const params = new URLSearchParams({
        ticker,
        look_back: String(lookBack),
        horizon: String(horizon),
        start,
      });
      if (end) params.append("end", end);
      const res = await fetch(`/api/backtest?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

  const axisColor = theme === "dark" ? "#fff" : "hsl(var(--foreground))";
  const tooltipBg =
    theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";

  const data = result?.results || [];
  const metrics = result?.metrics || {};

  const prices = data.map((d) => d.actual).concat(data.map((d) => d.pred));
  const minP = Math.min(...prices, 0);
  const maxP = Math.max(...prices, 1);
  const pad = Math.max((maxP - minP) * 0.02, 0.5);
  const domain = [minP - pad, maxP + pad];

  return (
    <div className="space-y-6 relative" aria-busy={loading}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-sm text-foreground">Crunching the numbers…</div>
        </div>
      )}

      <form onSubmit={run} className="flex flex-wrap items-end gap-2 text-sm">
        <h3 className="text-lg font-heading font-semibold mr-auto flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" /> LSTM Backtest
        </h3>
        <div className="flex flex-col">
          <label className="text-xs">Look Back</label>
          <input
            type="number"
            value={lookBack}
            onChange={(e) => setLookBack(Number(e.target.value))}
            className="px-2 py-1 rounded border bg-background w-24"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs">Horizon</label>
          <input
            type="number"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="px-2 py-1 rounded border bg-background w-24"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs">Start</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="px-2 py-1 rounded border bg-background"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs">End</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="px-2 py-1 rounded border bg-background"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Running…" : "Run Backtest"}
        </button>
      </form>

      {err && <div className="text-sm text-red-500">{String(err.message || err)}</div>}

      {!loading && !result && !err && (
        <div className="text-sm text-muted-foreground">
          No backtest yet, select parameters to run one.
        </div>
      )}

      {result && (
        <div className="space-y-6" aria-live="polite">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBox
              label="RMSE"
              value={(metrics.rmse || 0).toFixed(2)}
              format="number"
            />
            <MetricBox
              label="MAPE"
              value={(metrics.mape || 0).toFixed(2)}
              format="percentage"
            />
            <MetricBox
              label="Sharpe Ratio"
              value={(metrics.sharpe || 0).toFixed(2)}
              format="number"
            />
            <MetricBox
              label="Cumulative Return"
              value={((metrics.cumulative_return || 0) * 100).toFixed(2)}
              format="percentage"
            />
          </div>

          <ChartWrapper title="Predicted vs Actual">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data} margin={{ top: 24, right: 32, bottom: 28, left: 56 }}>
                <CartesianGrid strokeOpacity={0.12} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: axisColor }}
                  interval="preserveStartEnd"
                />
                <YAxis domain={domain} tick={{ fill: axisColor }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]}
                />
                <Line
                  dataKey="actual"
                  stroke="hsl(var(--chart-line, var(--primary)))"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  dataKey="pred"
                  stroke="#f97316"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>
      )}
    </div>
  );
}

