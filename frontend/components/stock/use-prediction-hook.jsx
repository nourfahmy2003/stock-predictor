"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

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

  async function start() {
    try {
      setErr(null);
      setResult(null);
      setState("starting");

      const body = JSON.stringify({ ticker, look_back: lookBack, horizon });
      const { jobId: _jid1, job_id: _jid2, id: _jid3 } = await api(`/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const jobId = _jid1 || _jid2 || _jid3;

      if (!jobId) throw new Error("Backend did not return jobId");
      activeJob.current = { ticker, jobId };
      setState("running");

      stopPolling();
      pollTimer.current = setInterval(async () => {
        try {
          if (!activeJob.current.jobId || activeJob.current.ticker !== ticker) return;

          const s = await api(`/status?jobId=${encodeURIComponent(activeJob.current.jobId)}`);
          if (s.state === "done") {
            setResult(s.result || s.forecast || s.data || null);
            setState("done");
            stopPolling();
          } else if (s.state === "error") {
            setErr(new Error(s.message || "Prediction failed"));
            setState("error");
            stopPolling();
          }
        } catch (e) {
          setErr(e);
          setState("error");
          stopPolling();
        }
      }, 1500);
    } catch (e) {
      setErr(e);
      setState("error");
      stopPolling();
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (activeJob.current.ticker && activeJob.current.ticker !== ticker) {
      activeJob.current = { ticker: null, jobId: null };
      stopPolling();
      setState("idle");
      setResult(null);
      setErr(null);
    }
  }, [ticker]);

  return { state, result, err, start };
}

