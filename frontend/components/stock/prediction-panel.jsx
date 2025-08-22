// components/stock/prediction-panel.jsx
"use client";
import React, { useEffect } from "react";
import { usePrediction } from "@/components/stock/use-prediction-hook";
import PredictionChart from "@/components/stock/PredictionChart";

export function PredictionPanel({ ticker, currency = "USD" }) {
  const { state, result, err, start } = usePrediction(ticker, 60, 10);
  const forecast = result?.forecast ?? null;
  const series = forecast?.series ?? [];

  useEffect(() => {
    if (ticker) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  return (
    <div className="space-y-4 text-zinc-900 dark:text-zinc-100">
      {(state === "error" || state === "done") && (
        <button
          onClick={start}
          className="px-4 py-2 rounded-md border border-zinc-700 bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
        >
          Re-run prediction
        </button>
      )}

      {state === "running" && (
        <div className="text-sm opacity-80">
          Crunching the model — this may take a few minutes…
        </div>
      )}

      {err && <div className="text-sm text-red-500">Error: {String(err.message || err)}</div>}

      {/* Chart of actuals + predictions */}
      {!!series.length && <PredictionChart data={series} currency={currency} />}
    </div>
  );
}
