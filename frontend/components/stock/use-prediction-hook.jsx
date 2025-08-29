"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useStockStore, DEFAULT_TTL } from "@/lib/store";

// Simple synchronous fetch (no jobs/polling)
export function usePrediction(ticker, { lookBack = 60, context = 100, backtestHorizon = 20, horizon = 10 } = {}) {
  const { getPrediction, setPrediction } = useStockStore();
  const [state, setState] = useState("idle"); // idle|loading|done|error
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const controllerRef = useRef(null);

  const run = async () => {
    if (!ticker) return;
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    const startedAt = Date.now();
    setState("loading");
    setErr(null);
    setPrediction(ticker, { status: "running", startedAt });
    try {
      const qs = new URLSearchParams({
        ticker,
        look_back: String(lookBack),
        context: String(context),
        backtest_horizon: String(backtestHorizon),
        horizon: String(horizon),
      }).toString();
      const data = await api(`/forecast?${qs}`, { signal: controllerRef.current.signal });
      const entry = {
        status: "done",
        resultJson: data,
        startedAt,
        finishedAt: Date.now(),
        ttlMs: DEFAULT_TTL,
      };
      setPrediction(ticker, entry);
      setResult(data);
      setState("done");
    } catch (e) {
      if (controllerRef.current?.signal.aborted) return;
      setErr(e);
      setState("error");
      setPrediction(ticker, {
        status: "error",
        resultJson: null,
        startedAt,
        finishedAt: Date.now(),
        ttlMs: DEFAULT_TTL,
      });
    }
  };

  useEffect(() => {
    if (!ticker) { setState("idle"); setResult(null); setErr(null); return; }
    const cached = getPrediction(ticker);
    if (cached) {
      setState(cached.status === "running" ? "loading" : cached.status);
      setResult(cached.resultJson || null);
      if (cached.status === "running" || cached.status === "done") return;
    }
    run();
    return () => controllerRef.current?.abort();
  }, [ticker, lookBack, context, backtestHorizon, horizon]);

  const retry = () => run();

  return { state, result, err, retry };
}
