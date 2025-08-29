"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStockStore } from "@/hooks/stock-store";

export function usePrediction(
  ticker,
  { lookBack = 60, context = 100, backtestHorizon = 20, horizon = 10, ttlMs = 300000 } = {}
) {
  const { predictions, setPredictions } = useStockStore();
  const entry = predictions[ticker];
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!ticker) return;
    const now = Date.now();
    if (entry) {
      const ttl = entry.ttlMs ?? ttlMs;
      if (entry.status === "running") return;
      if (entry.status === "done" && entry.finishedAt && now - entry.finishedAt < ttl) {
        return;
      }
    }

    const controller = new AbortController();
    setErr(null);
    setPredictions((prev) => ({
      ...prev,
      [ticker]: { status: "running", resultJson: entry?.resultJson || null, startedAt: now, ttlMs },
    }));

    (async () => {
      try {
        const qs = new URLSearchParams({
          ticker,
          look_back: String(lookBack),
          context: String(context),
          backtest_horizon: String(backtestHorizon),
          horizon: String(horizon),
        }).toString();
        const data = await api(`/forecast?${qs}`, { signal: controller.signal });
        setPredictions((prev) => ({
          ...prev,
          [ticker]: {
            status: "done",
            resultJson: data,
            startedAt: now,
            finishedAt: Date.now(),
            ttlMs,
          },
        }));
      } catch (e) {
        if (e.name === "AbortError") return;
        setErr(e);
        setPredictions((prev) => ({
          ...prev,
          [ticker]: {
            status: "error",
            resultJson: entry?.resultJson || null,
            startedAt: now,
            finishedAt: Date.now(),
            ttlMs,
          },
        }));
      }
    })();

    return () => controller.abort();
  }, [ticker, lookBack, context, backtestHorizon, horizon, ttlMs, entry, setPredictions]);

  const current = predictions[ticker];
  const refresh = () => {
    setPredictions((prev) => {
      const copy = { ...prev };
      delete copy[ticker];
      return copy;
    });
  };
  return { status: current?.status || "idle", result: current?.resultJson || null, err, refresh };
}
