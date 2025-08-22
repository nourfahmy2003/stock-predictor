"use client";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { MetricBox } from "@/components/stock/metric-box";
import { ChartWrapper } from "@/components/stock/chart-wrapper";
import { api } from "@/lib/api";

export function BacktestTab({ ticker }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  // auto-run on mount / ticker change
  useEffect(() => {
    if (!ticker) return;
    let aborted = false;
    (async () => {
      setLoading(true); setErr(null); setResult(null);
      try {
  const resp = await api(`/backtest/accuracy?ticker=${encodeURIComponent(ticker)}`);

  // If api(...) returns a fetch Response, parse it. If it already returns parsed JSON, use it directly.
  let data;
  if (resp && typeof resp === "object" && "ok" in resp) {
    if (!resp.ok) throw new Error(await resp.text());
    data = await resp.json();
  } else {
    data = resp; // already parsed JSON
  }

  if (!aborted) setResult(data);
} catch (e) {
  if (!aborted) setErr(e);
} finally {
  if (!aborted) setLoading(false);
}
    })();
    return () => { aborted = true; };
  }, [ticker]);

  const axisColor = theme === "dark" ? "#fff" : "hsl(var(--foreground))";
  const tooltipBg = theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";
  const data = result?.results || [];
  const metrics = result?.metrics || {};

  const domain = useMemo(() => {
    const prices = data.flatMap(d => [d.actual, d.pred]).filter(Number.isFinite);
    if (!prices.length) return [0, 1];
    const lo = Math.min(...prices), hi = Math.max(...prices);
    const pad = Math.max((hi - lo) * 0.02, 0.5);
    return [lo - pad, hi + pad];
  }, [data]);

  return (
    <div className="space-y-6 relative" aria-busy={loading}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-sm text-foreground">Evaluating last 10 days…</div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <h3 className="text-lg font-heading font-semibold">Model Accuracy (last 10 days)</h3>
      </div>

      {err && <div className="text-sm text-red-500">{String(err.message || err)}</div>}

      {!loading && !result && !err && (
        <div className="text-sm text-muted-foreground">No backtest yet.</div>
      )}

      {result && (
        <div className="space-y-6" aria-live="polite">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBox label="RMSE" value={(metrics.rmse || 0).toFixed(2)} format="number" />
            <MetricBox label="MAPE" value={(metrics.mape || 0).toFixed(2)} format="percentage" />
            <MetricBox label="Sharpe (dir. guess)" value={(metrics.sharpe || 0).toFixed(2)} format="number" />
            <MetricBox label="Cumulative Return (dir.)" value={((metrics.cumulative_return || 0) * 100).toFixed(2)} format="percentage" />
          </div>

          <ChartWrapper title="Predicted vs Actual (last 10 sessions)">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data} margin={{ top: 24, right: 32, bottom: 28, left: 56 }}>
                <CartesianGrid strokeOpacity={0.12} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: axisColor }} interval="preserveStartEnd" />
                <YAxis domain={domain} tick={{ fill: axisColor }} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: "1px solid hsl(var(--border))" }}
                  formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === "actual" ? "Actual" : "Predicted"]}
                />
                <Line dataKey="actual" stroke="hsl(var(--chart-line, var(--primary)))" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line dataKey="pred" stroke="#f97316" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>
      )}
    </div>
  );
}
