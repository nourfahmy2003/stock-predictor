"use client";
import React from "react";
import { usePrediction } from "@/components/stock/use-prediction-hook";

export function PredictionPanel({ ticker }) {
  const { state, result, err, start } = usePrediction(ticker, 60, 10);

  return (
    <div className="space-y-3">
      <button
        onClick={start}
        disabled={state === "starting" || state === "running"}
        className="px-4 py-2 rounded-md border bg-zinc-900 text-zinc-100 disabled:opacity-60"
      >
        {state === "running" || state === "starting" ? "Running…" : "Run prediction"}
      </button>

      {state !== "idle" && (
        <div className="text-sm opacity-70">
          {state === "starting" && "Starting job…"}
          {state === "running" && "Crunching the model — this may take a few minutes…"}
        </div>
      )}

      {err && (
        <div className="text-sm text-red-500">Error: {String(err.message || err)}</div>
      )}

      {state === "done" && result && (
        <pre className="text-xs bg-zinc-900/50 p-3 rounded">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

