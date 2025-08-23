"use client";
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricBox } from "@/components/stock/metric-box";
import { ChartWrapper } from "@/components/stock/chart-wrapper";
import DayRange from "@/components/stock/DayRange";
import PredictionChart from "./PredictionChart";
import { usePrediction } from "./use-prediction-hook";

export default function PredictionPanel({ ticker }) {
  const lookBack = 60;
  const context = 100;
  const backtestHorizon = 20;
  const horizon = 10;

  const { state, result, err } = usePrediction(ticker, { lookBack, context, backtestHorizon, horizon });
  const loading = state === "loading";

  const series = useMemo(() => result?.forecast || [], [result]);
  const metrics = result?.metrics || {};

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBox label="Accuracy (direction)" value={(metrics.accuracy_pct || 0).toFixed(1)} format="percentage" />
            <MetricBox label="MAPE (backtest)" value={(metrics.mape || 0).toFixed(2)} format="percentage" />
            <MetricBox label="Expected 10-day move" value={(metrics.expected_10d_move_pct || 0).toFixed(2)} format="percentage" />
            <MetricBox label="RMSE (backtest)" value={(metrics.rmse || 0).toFixed(2)} format="number" />
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-heading font-medium">Last {context} days + backtest {backtestHorizon}d + forecast {horizon}d</div>
              <DayRange disabled value={context} />
            </div>
            <ChartWrapper title="">
              <PredictionChart data={series} />
            </ChartWrapper>
            <div className="text-xs text-muted-foreground mt-3">
              Orange = model prediction; Blue = actual. “Backtest” segment shows one-step predictions on the last {backtestHorizon} sessions.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
