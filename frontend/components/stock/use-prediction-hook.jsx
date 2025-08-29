"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// In-memory cache and in-flight registries shared across components/tabs
const predictions = {}; // ticker -> { status, resultJson, error, startedAt, finishedAt, ttlMs }
const inFlight = {}; // ticker -> { controller, promise }
const listeners = new Map(); // ticker -> Set<fn>

function notify(ticker) {
  const set = listeners.get(ticker);
  if (set) {
    for (const fn of Array.from(set)) fn();
  }
}

function subscribe(ticker, fn) {
  let set = listeners.get(ticker);
  if (!set) listeners.set(ticker, (set = new Set()));
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) listeners.delete(ticker);
  };
}

async function startPrediction(ticker, params) {
  if (inFlight[ticker]) return inFlight[ticker];

  const { lookBack, context, backtestHorizon, horizon, ttlMs } = params;
  const controller = new AbortController();
  const startedAt = Date.now();

  const prev = predictions[ticker];
  predictions[ticker] = {
    status: "running",
    resultJson: prev?.resultJson || null,
    error: null,
    startedAt,
    finishedAt: null,
    ttlMs,
  };
  notify(ticker);

  const qs = new URLSearchParams({
    ticker,
    look_back: String(lookBack),
    context: String(context),
    backtest_horizon: String(backtestHorizon),
    horizon: String(horizon),
  }).toString();

  const promise = api(`/forecast?${qs}`, { signal: controller.signal })
    .then((data) => {
      predictions[ticker] = {
        status: "done",
        resultJson: data,
        error: null,
        startedAt,
        finishedAt: Date.now(),
        ttlMs,
      };
    })
    .catch((err) => {
      if (err.name === "AbortError") return;
      const prevData = predictions[ticker];
      predictions[ticker] = {
        status: "error",
        resultJson: prevData?.resultJson || null,
        error: err,
        startedAt,
        finishedAt: Date.now(),
        ttlMs,
      };
    })
    .finally(() => {
      delete inFlight[ticker];
      notify(ticker);
    });

  inFlight[ticker] = { controller, promise };
  return inFlight[ticker];
}

export function usePrediction(
  ticker,
  {
    lookBack = 60,
    context = 100,
    backtestHorizon = 20,
    horizon = 10,
    ttlMs = 5 * 60 * 1000,
  } = {}
) {
  const [, setVersion] = useState(0);
  const prevTicker = useRef(null);

  useEffect(() => {
    if (!ticker) return;
    return subscribe(ticker, () => setVersion((v) => v + 1));
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;
    const params = { lookBack, context, backtestHorizon, horizon, ttlMs };
    const entry = predictions[ticker];
    const now = Date.now();
    let timeout;

    if (!entry) {
      startPrediction(ticker, params);
    } else if (entry.status !== "running") {
      const expiry = entry.finishedAt ? entry.finishedAt + entry.ttlMs : 0;
      if (expiry <= now) {
        startPrediction(ticker, params);
      } else {
        timeout = setTimeout(() => startPrediction(ticker, params), expiry - now);
      }
    }

    if (prevTicker.current && prevTicker.current !== ticker) {
      const infl = inFlight[prevTicker.current];
      if (infl) infl.controller.abort();
    }
    prevTicker.current = ticker;

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [ticker, lookBack, context, backtestHorizon, horizon, ttlMs, setVersion]);

  const entry = predictions[ticker] || {
    status: "idle",
    resultJson: null,
    error: null,
    startedAt: null,
    finishedAt: null,
    ttlMs,
  };

  const uiState =
    entry.status === "running"
      ? entry.resultJson
        ? "done"
        : "loading"
      : entry.status;

  return { state: uiState, result: entry.resultJson, err: entry.error };
}

// Expose cache for potential inspection/debugging (not used in UI)
export const _predictionCache = predictions;
