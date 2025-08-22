"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const keyFor = (t) => `backjob:${(t || "").toUpperCase()}`;

export function useBacktest(ticker) {
  const [state, setState] = useState("idle"); // idle | starting | running | done | error
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const pollTimer = useRef(null);
  const activeJob = useRef({ ticker: null, jobId: null });

  function clearSaved(t) {
    try { localStorage.removeItem(keyFor(t)); } catch {}
  }

  function stop() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function poll() {
    try {
      if (!activeJob.current.jobId || activeJob.current.ticker !== ticker) return;
      const jobId = activeJob.current.jobId;

      const st = await api(`/backtest/status?jobId=${encodeURIComponent(jobId)}`);
      setPct(st.pct || 0);

      if (st.state === "done") {
        const res = await api(`/backtest/result?jobId=${encodeURIComponent(jobId)}`);
        setResult(res);
        setState("done");
        clearSaved(ticker);
        stop();
      } else if (st.state === "error") {
        setErr(new Error(st.message || "Backtest failed"));
        setState("error");
        clearSaved(ticker);
        stop();
      } else {
        setState("running");
      }
    } catch (e) {
      // If server restarted, status may 404 → reset cleanly
      setErr(e);
      setState("idle");
      clearSaved(ticker);
      stop();
    }
  }

  async function start(params) {
    if (!ticker) return;
    if (state === "starting" || state === "running") return;
    try {
      setErr(null);
      setResult(null);
      setState("starting");
      setPct(0);

      const res = await api(`/backtest/run`, {
        method: "POST",
        body: { ticker, ...params },
      });

      const jobId = res.jobId;
      if (!jobId) throw new Error("Backend did not return jobId");

      activeJob.current = { ticker, jobId };
      try {
        localStorage.setItem(keyFor(ticker), JSON.stringify({ jobId, startedAt: Date.now() }));
      } catch {}

      setState("running");
      pollTimer.current = setInterval(poll, 600);
    } catch (e) {
      setErr(e);
      setState("error");
    }
  }

  // Resume any in‑flight job when ticker tab is opened
  useEffect(() => {
    stop();
    setPct(0);
    setResult(null);
    setErr(null);

    if (!ticker) {
      setState("idle");
      return;
    }

    try {
      const saved = localStorage.getItem(keyFor(ticker));
      if (saved) {
        const { jobId } = JSON.parse(saved);
        if (jobId) {
          activeJob.current = { ticker, jobId };
          setState("running");
          pollTimer.current = setInterval(poll, 600);
          return;
        }
      }
    } catch {}

    activeJob.current = { ticker: null, jobId: null };
    setState("idle");
  }, [ticker]);

  useEffect(() => () => stop(), []);

  return { state, pct, result, err, start };
}
