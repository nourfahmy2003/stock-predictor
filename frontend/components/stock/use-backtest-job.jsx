"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const keyFor = (t) => `backjob:${(t || "").toUpperCase()}`;

export function useBacktest(ticker) {
  const [state, setState] = useState("idle");
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const pollTimer = useRef(null);
  const activeJob = useRef({ ticker: null, jobId: null });

  function stop() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function poll() {
    try {
      if (!activeJob.current.jobId || activeJob.current.ticker !== ticker) return;
      const st = await api(`/backtest/status?jobId=${encodeURIComponent(activeJob.current.jobId)}`);
      setPct(st.pct || 0);
      if (st.state === "done") {
        const res = await api(`/backtest/result?jobId=${encodeURIComponent(activeJob.current.jobId)}`);
        setResult(res);
        setState("done");
        stop();
      } else if (st.state === "error") {
        setErr(new Error(st.message || "Backtest failed"));
        setState("error");
        stop();
      } else {
        setState("running");
      }
    } catch (e) {
      setErr(e);
      setState("error");
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
      const res = await api(`/backtest/run`, {
        method: "POST",
        body: { ticker, ...params },
      });
      const jobId = res.jobId;
      if (!jobId) throw new Error("Backend did not return jobId");
      activeJob.current = { ticker, jobId };
      localStorage.setItem(keyFor(ticker), JSON.stringify({ jobId, startedAt: Date.now() }));
      setState("running");
      setPct(0);
      pollTimer.current = setInterval(poll, 500);
    } catch (e) {
      setErr(e);
      setState("error");
    }
  }

  useEffect(() => {
    if (!ticker) return;
    try {
      const saved = localStorage.getItem(keyFor(ticker));
      if (saved) {
        const { jobId } = JSON.parse(saved);
        if (jobId) {
          activeJob.current = { ticker, jobId };
          setState("running");
          pollTimer.current = setInterval(poll, 500);
          return;
        }
      }
      setState("idle");
      setResult(null);
      setErr(null);
      setPct(0);
    } catch {
      setState("idle");
    }
  }, [ticker]);

  useEffect(() => () => stop(), []);

  return { state, pct, result, err, start };
}
