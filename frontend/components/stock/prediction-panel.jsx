"use client";
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricBox } from "@/components/stock/metric-box";
import { ChartWrapper } from "@/components/stock/chart-wrapper";
import DayRange from "@/components/stock/DayRange";
import PredictionChart from "./PredictionChart";
import { StatCard } from "@/components/stock/stat-card";
import { usePrediction } from "./use-prediction-hook";

export default function PredictionPanel({ ticker }) {
  const lookBack = 60;
  const context = 100;
  const backtestHorizon = 20;
  const horizon = 10;

  const { state, result, err } = usePrediction(ticker, { lookBack, context, backtestHorizon, horizon });
  const loading = state === "loading";

  const metrics = result?.metrics || {};
  const series = useMemo(() => {
    const raw = result?.forecast || [];
    return raw
      .filter((r) => r.part !== "context")
      .map((r) => {
        let accuracy = null;
        if (Number.isFinite(r.pred) && Number.isFinite(r.actual)) {
          const denom = r.actual === 0 ? 1 : r.actual;
          const pctErr = Math.abs((r.pred - r.actual) / denom) * 100;
          accuracy = 100 - pctErr;
        }
        return { ...r, accuracy };
      });
  }, [result]);

  const backtestRows = useMemo(
    () => series.filter((r) => r.part === "backtest" && r.accuracy !== null),
    [series]
  );
  const avgAbsErr =
    backtestRows.length > 0
      ? backtestRows.reduce((s, r) => s + Math.abs(r.pred - r.actual), 0) /
        backtestRows.length
      : 0;
  const meanPctErr =
    backtestRows.length > 0
      ?
          backtestRows.reduce(
            (s, r) =>
              s +
              Math.abs(
                (r.pred - r.actual) / (r.actual === 0 ? 1 : r.actual)
              ) * 100,
            0
          ) /
        backtestRows.length
      : 0;
  const avgAccuracy = backtestRows.length > 0 ? 100 - meanPctErr : 0;
  const directionalAcc = metrics.accuracy_pct || 0;

  return (
    <div className="space-y-6 relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-sm text-foreground">Running LSTM notebook…</div>
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
          {/* Friendly KPIs for general users */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            <MetricBox
              label="Avg 20-day Accuracy"
              value={avgAccuracy.toFixed(1)}
              format="percentage"
            />
            <MetricBox
              label="Average Absolute Error"
              value={Number(avgAbsErr.toFixed(2))}
              format="currency"
            />
            <MetricBox
              label="Mean % Error"
              value={meanPctErr.toFixed(2)}
              format="percentage"
            />
          </div>

          <Card className="p-4">
            
              <ChartWrapper
                title="Price: Actual vs 10-Day Prediction"
                subtitle="Showing last 20 days + next 10 days"
              >
                <PredictionChart data={series} />
              </ChartWrapper>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <StatCard
                title="Typical prediction error"
                value={`$${avgAbsErr.toFixed(2)}`}
                description="over last 20 days"
              />
              <StatCard
                title="Directional accuracy"
                value={`${directionalAcc.toFixed(1)}%`}
                description="over last 20 days"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
