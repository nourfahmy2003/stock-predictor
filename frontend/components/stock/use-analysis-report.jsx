"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const DEFAULT_TTL = 2 * 60 * 1000;

const cache = new Map(); // key -> entry
const inflight = new Map(); // key -> { controller, promise }
const listeners = new Map(); // key -> Set<fn>

function makeKey(symbol, interval) {
  return `${symbol.toUpperCase()}::${interval}`;
}

function notify(key) {
  const set = listeners.get(key);
  if (!set) return;
  for (const fn of Array.from(set)) fn();
}

function subscribe(key, fn) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) listeners.delete(key);
  };
}

async function startFetch(symbol, interval, ttlMs = DEFAULT_TTL) {
  const key = makeKey(symbol, interval);
  if (inflight.has(key)) return inflight.get(key);

  const controller = new AbortController();
  const startedAt = Date.now();
  const prev = cache.get(key);
  cache.set(key, {
    status: "loading",
    data: prev?.data ?? null,
    error: null,
    startedAt,
    finishedAt: null,
    ttlMs,
  });
  notify(key);

  const query = new URLSearchParams({ symbol, interval }).toString();
  const promise = api(`/analysis/report?${query}`, { signal: controller.signal })
    .then((data) => {
      cache.set(key, {
        status: "ready",
        data,
        error: null,
        startedAt,
        finishedAt: Date.now(),
        ttlMs,
      });
    })
    .catch((error) => {
      if (error.name === "AbortError") return;
      cache.set(key, {
        status: "error",
        data: prev?.data ?? null,
        error,
        startedAt,
        finishedAt: Date.now(),
        ttlMs,
      });
    })
    .finally(() => {
      inflight.delete(key);
      notify(key);
    });

  const entry = { controller, promise };
  inflight.set(key, entry);
  return entry;
}

export function useAnalysisReport(
  symbol,
  interval,
  { ttlMs = DEFAULT_TTL } = {}
) {
  const [version, setVersion] = useState(0);
  const prevKey = useRef(null);
  const key = symbol && interval ? makeKey(symbol, interval) : null;

  useEffect(() => {
    if (!key) return undefined;
    return subscribe(key, () => setVersion((v) => v + 1));
  }, [key]);

  useEffect(() => {
    if (!symbol || !interval) return undefined;
    const entryKey = makeKey(symbol, interval);
    const cached = cache.get(entryKey);
    const now = Date.now();
    let timeoutId;

    if (!cached) {
      startFetch(symbol, interval, ttlMs);
    } else if (cached.status !== "loading") {
      const expiry = cached.finishedAt ? cached.finishedAt + cached.ttlMs : 0;
      if (expiry <= now) {
        startFetch(symbol, interval, ttlMs);
      } else {
        timeoutId = setTimeout(() => startFetch(symbol, interval, ttlMs), expiry - now);
      }
    }

    if (prevKey.current && prevKey.current !== entryKey) {
      const inFlightPrev = inflight.get(prevKey.current);
      if (inFlightPrev) inFlightPrev.controller.abort();
    }
    prevKey.current = entryKey;

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [symbol, interval, ttlMs]);

  const entry = key
    ? cache.get(key) || {
        status: "idle",
        data: null,
        error: null,
        startedAt: null,
        finishedAt: null,
        ttlMs,
      }
    : { status: "idle", data: null, error: null };

  const refresh = () => {
    if (!symbol || !interval) return;
    const entryKey = makeKey(symbol, interval);
    const current = inflight.get(entryKey);
    if (current) current.controller.abort();
    startFetch(symbol, interval, ttlMs);
  };

  return { state: entry.status, report: entry.data, error: entry.error, refresh };
}

export const _analysisCache = cache;
