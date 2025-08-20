"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const keyFor = (t) => `predjob:${(t || "").toUpperCase()}`;

export function usePrediction(ticker, lookBack = 60, horizon = 10) {
  const [state, setState] = useState("idle"); // idle|starting|running|done|error
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const pollTimer = useRef(null);
  const activeJob = useRef({ ticker: null, jobId: null });

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function startPolling() {
    stopPolling();
    pollTimer.current = setInterval(async () => {
      try {
        if (!activeJob.current.jobId || activeJob.current.ticker !== ticker) return;
        const s = await api(`/status?jobId=${encodeURIComponent(activeJob.current.jobId)}`);

        if (s.state === "done") {
          setResult(s.result || s.forecast || s.data || null);
          setState("done");
          // keep jobId in storage if you want to *avoid* re-running button permanently.
          // If you prefer allowing re-run after done, uncomment next line:
          // localStorage.removeItem(keyFor(ticker));
          stopPolling();
        } else if (s.state === "error") {
          setErr(new Error(s.message || "Prediction failed"));
          setState("error");
          localStorage.removeItem(keyFor(ticker));
          stopPolling();
        } else {
          // queued|running
          setState("running");
        }
      } catch (e) {
        setErr(e);
        setState("error");
        stopPolling();
      }
    }, 1500);
  }

  async function start() {
    if (!ticker) return;
    if (state === "starting" || state === "running") return;

    try {
      setErr(null);
      setResult(null);
      setState("starting");

      const body = { ticker, look_back: lookBack, horizon };
      const res = await api(`/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const jobId = res.jobId || res.job_id || res.id;
      if (!jobId) throw new Error("Backend did not return jobId");

      activeJob.current = { ticker, jobId };
      localStorage.setItem(keyFor(ticker), JSON.stringify({ jobId, startedAt: Date.now() }));
      setState("running");
      await startPolling();
    } catch (e) {
      setErr(e);
      setState("error");
    }
  }

  // Resume a running job if one exists in localStorage for this ticker
  useEffect(() => {
    if (!ticker) return;
    try {
      const saved = localStorage.getItem(keyFor(ticker));
      if (saved) {
        const { jobId } = JSON.parse(saved);
        if (jobId) {
          activeJob.current = { ticker, jobId };
          setState("running");
          startPolling();
          return;
        }
      }
      // no saved job
      setState("idle");
      setResult(null);
      setErr(null);
    } catch {
      setState("idle");
    }
  }, [ticker]);

  // Clean interval on unmount (do not clear localStorage — job continues server-side)
  useEffect(() => () => stopPolling(), []);

  return { state, result, err, start };
}
