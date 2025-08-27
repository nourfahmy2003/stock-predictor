"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricBox } from "@/components/stock/metric-box";
import { ChartWrapper } from "@/components/stock/chart-wrapper";
import PredictionChart from "./PredictionChart";
import { StatCard } from "@/components/stock/stat-card";
import { usePrediction } from "./use-prediction-hook";
import Loader from "@/components/ui/loader";

export default function PredictionPanel({ ticker }) {
  // same knobs as before
  const lookBack = 60;
  const context = 100;
  const backtestHorizon = 20;
  const horizon = 10;

  // ⚠️ Ensure the hook calls GET /forecast (not POST /predict)
  const { state, result, err } = usePrediction(ticker, {
    lookBack,
    context,
    backtestHorizon,
    horizon,
  });
  const loading = state === "loading";

  // Normalize server rows → old shape the chart/KPIs expect
  const series = useMemo(() => {
    const raw = Array.isArray(result?.forecast) ? result.forecast : [];

    return raw
      .map((r) => {
        // pick predicted value from either `pred` or `predicted`
        const pred =
          typeof r.pred === "number"
            ? r.pred
            : typeof r.predicted === "number"
            ? r.predicted
            : undefined;

        const actual = typeof r.actual === "number" ? r.actual : undefined;

        // decide segment if missing:
        // if both present → backtest, only actual → history, only pred → forecast
        let part = r.part;
        if (!part) {
          if (actual != null && pred != null) part = "backtest";
          else if (actual != null) part = "history";
          else part = "forecast";
        }

        // compute point accuracy only when we have both
        let accuracy = null;
        if (Number.isFinite(pred) && Number.isFinite(actual)) {
          const denom = actual === 0 ? 1 : actual;
          const pctErr = Math.abs((pred - actual) / denom) * 100;
          accuracy = 100 - pctErr;
        }

        return {
          date: r.date,
          actual,
          pred,
          part,
          accuracy,
        };
      })
      .filter((r) => r.part !== "context");
  }, [result]);

  // Backtest-only rows (paired actual + pred)
  const backtestRows = useMemo(
    () => series.filter((r) => r.part === "backtest" && Number.isFinite(r.accuracy)),
    [series]
  );

  // Safe-number helpers
  const nz = (n) => (Number.isFinite(n) ? n : 0);

  // KPIs as numbers (never null/NaN)
  const avgAbsErr = (() => {
    if (!backtestRows.length) return 0;
    const s = backtestRows.reduce((sum, r) => sum + Math.abs(r.pred - r.actual), 0);
    return s / backtestRows.length;
  })();

  const meanPctErr = (() => {
    if (!backtestRows.length) return 0;
    const s = backtestRows.reduce((sum, r) => {
      const denom = r.actual === 0 ? 1 : r.actual;
      return sum + Math.abs((r.pred - r.actual) / denom) * 100;
    }, 0);
    return s / backtestRows.length;
  })();

  const avgAccuracy = backtestRows.length ? 100 - meanPctErr : 0;

  // Directional probability from new backend (fallback to 0)
  const directionalAcc =
    typeof result?.metrics?.direction_up_prob === "number"
      ? result.metrics.direction_up_prob * 100
      : 0;

  return (
    <div className="space-y-6 relative min-h-[520px]">
      {loading && (
        <div className="absolute inset-x-0 top-24 bottom-0 z-10 grid place-items-center">
          <Loader size={320} />
        </div>
      )}

      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <h3 className="text-lg font-heading font-semibold">Prediction & Accuracy (LSTM)</h3>
      </div>

      {err && <div className="text-sm text-red-500">{String(err.message || err)}</div>}

      {!loading && !result && !err && (
        <div className="text-sm text-muted-foreground">No prediction yet.</div>
      )}

      {result && (
        <div className="space-y-6" aria-live="polite">
          {/* KPIs – always numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            <MetricBox label="Avg 20-day Accuracy" value={Number(nz(avgAccuracy).toFixed(1))} format="percentage" />
            <MetricBox label="Average Absolute Error" value={Number(nz(avgAbsErr).toFixed(2))} format="currency" />
            <MetricBox label="Mean % Error" value={Number(nz(meanPctErr).toFixed(2))} format="percentage" />
          </div>

          <Card className="p-4">
            <ChartWrapper title="Price: Actual vs 10-Day Prediction" subtitle="Showing last 20 days + next 10 days">
              {/* Chart still consumes .actual, .pred, .part */}
              <PredictionChart data={series} />
            </ChartWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <StatCard title="Typical prediction error" value={`$${nz(avgAbsErr).toFixed(2)}`} description="over last 20 days" />
              <StatCard title="Directional accuracy" value={`${nz(directionalAcc).toFixed(1)}%`} description="probability next 10 days are up" />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
