"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Simple synchronous fetch (no jobs/polling)
export function usePrediction(ticker, { lookBack = 60, context = 100, backtestHorizon = 20, horizon = 10 } = {}) {
  const [state, setState] = useState("idle");   // idle|loading|done|error
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let aborted = false;
    async function run() {
      if (!ticker) { setState("idle"); setResult(null); setErr(null); return; }
      setState("loading"); setErr(null); setResult(null);
      try {
        // NOTE: api() should prefix '/api/forecast' behind the scenes
        const qs = new URLSearchParams({
          ticker,
          look_back: String(lookBack),
          context: String(context),
          backtest_horizon: String(backtestHorizon),
          horizon: String(horizon),
        }).toString();
        const data = await api(`/forecast?${qs}`);  // -> GET /api/forecast/forecast?... to backend
        if (!aborted) {
          setResult(data);
          setState("done");
        }
      } catch (e) {
        if (!aborted) {
          setErr(e);
          setState("error");
        }
      }
    }
    run();
    return () => { aborted = true; };
  }, [ticker, lookBack, context, backtestHorizon, horizon]);

  return { state, result, err };
}
