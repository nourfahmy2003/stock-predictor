// components/stock/prediction-panel.jsx
"use client";
import React from "react";
import { usePrediction } from "@/components/stock/use-prediction-hook";
import PredictionChart from "@/components/stock/PredictionChart";

function ForecastTable({ forecast = [] }) {
  if (!forecast?.length) return <div className="text-sm opacity-70">No forecast returned.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700/40">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900/50">
          <tr className="text-left">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Pred. Price</th>
            <th className="px-3 py-2">Pred. Return</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((r) => (
            <tr key={r.date} className="border-t border-zinc-800/50">
              <td className="px-3 py-2">{r.date}</td>
              <td className="px-3 py-2">{r.pred_price?.toFixed?.(2) ?? "—"}</td>
              <td className="px-3 py-2">
                {r.pred_return != null ? (r.pred_return * 100).toFixed(2) + "%" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PredictionPanel({ ticker, currency = "USD" }) {
  const { state, result, err, start } = usePrediction(ticker, 60, 10);
  const forecast = result?.forecast ?? result ?? [];

  return (
    <div className="space-y-4 text-zinc-900 dark:text-zinc-100">
      {/* Hide the button after success; show when idle/error */}
      {(state === "idle" || state === "error") && (
        <button
          onClick={start}
          disabled={state === "starting" || state === "running"}
          className="px-4 py-2 rounded-md border border-zinc-700 bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-60"
        >
          {state === "starting" ? "Starting…" : "Run prediction"}
        </button>
      )}

      {state === "running" && (
        <div className="text-sm opacity-80">
          Crunching the model — this may take a few minutes…
        </div>
      )}

      {err && <div className="text-sm text-red-500">Error: {String(err.message || err)}</div>}

      {/* Chart first */}
      {!!forecast.length && <PredictionChart data={forecast} currency={currency} />}

      {/* Keep table below as a numeric view (optional) */}
      {/* {!!forecast.length && <ForecastTable forecast={forecast} />} */}
    </div>
  );
}
