"use client";
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricBox } from "@/components/stock/metric-box";
import { ChartWrapper } from "@/components/stock/chart-wrapper";
import Loader from "@/components/ui/loader";
import { usePrediction } from "./use-prediction-hook";
import dynamic from "next/dynamic";

const PredictionChart = dynamic(() => import("./PredictionChart"), { ssr: false });

function PredictionPanel({ ticker }) {
  // model params
  const lookBack = 60;
  const context = 100;
  const backtestHorizon = 20;
  const horizon = 10;

  const { state, result, err } = usePrediction(ticker, {
    lookBack,
    context,
    backtestHorizon,
    horizon,
  });

  const loading = state === "loading";

  // ---- Build series + per-row accuracy
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

  // ---- KPIs from backtest window
  const backtestRows = useMemo(
    () => series.filter((r) => r.part === "backtest" && r.accuracy !== null),
    [series]
  );

  const avgAbsErr =
    backtestRows.length > 0
      ? backtestRows.reduce((s, r) => s + Math.abs(r.pred - r.actual), 0) / backtestRows.length
      : 0;

  const meanPctErr =
    backtestRows.length > 0
      ? backtestRows.reduce(
          (s, r) => s + Math.abs((r.pred - r.actual) / (r.actual === 0 ? 1 : r.actual)) * 100,
          0
        ) / backtestRows.length
      : 0;

  const avgAccuracy = backtestRows.length > 0 ? 100 - meanPctErr : 0;
  const directionalAcc = result?.metrics?.accuracy_pct ?? null; // if you still want it somewhere later

  // ---- Subtitle: date range + forecast start
  const subtitle = useMemo(() => {
    if (!series.length) return "Showing last 20 days + next 10 days";
    const dtf = new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" });
    const start = dtf.format(new Date(series[0].date));
    const end = dtf.format(new Date(series[series.length - 1].date));
    const forecastStart = series.find((d) => d.part === "forecast")?.date;
    const cut = forecastStart ? dtf.format(new Date(forecastStart)) : null;
    return cut
      ? `${start} – ${end} • forecast starts ${cut}`
      : `${start} – ${end}`;
  }, [series]);

  return (
    <div className="space-y-5 relative min-h-[520px]">
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
        <div className="space-y-5" aria-live="polite">
          {/* Compact KPI strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          {/* Chart only — no duplicated stat cards below */}
          <Card className="p-4">
            <ChartWrapper title="Price: Actual vs 10-Day Prediction" subtitle={subtitle}>
              <PredictionChart data={series} />
            </ChartWrapper>
          </Card>
        </div>
      )}
    </div>
  );
}

export { PredictionPanel };
export default PredictionPanel;
