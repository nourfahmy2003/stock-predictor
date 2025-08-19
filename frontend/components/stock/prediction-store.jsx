"use client"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { API } from "@/lib/api"

const PredictionCtx = createContext(null)
export function usePrediction() {
  return useContext(PredictionCtx)
}

export function PredictionStoreProvider({ children }) {
  const [state, setState] = useState({ active: null, forecast: null, error: null })
  const activeRef = useRef(state.active)
  useEffect(() => {
    activeRef.current = state.active
  }, [state.active])

  async function run(ticker, { look_back = 60, horizon = 10 } = {}) {
    setState((s) => ({ ...s, active: { ticker, jobId: null }, error: null, forecast: null }))

    try {
      const res = await API(`/forecast?ticker=${ticker}&look_back=${look_back}&horizon=${horizon}`)
      if (!res.ok) throw new Error("forecast request failed")
      const { jobId } = await res.json()
      setState((s) => ({ ...s, active: { ticker, jobId } }))
      await poll(jobId, ticker)
    } catch (e) {
      setState((s) => ({ ...s, error: e?.message || "Prediction failed", active: null }))
    }
  }

  async function poll(jobId, ticker) {
    while (true) {
      await new Promise((r) => setTimeout(r, 1500))
      if (activeRef.current?.ticker !== ticker) return
      const r = await API(`/status?jobId=${jobId}`)
      if (!r.ok) break
      const json = await r.json()
      if (json.state === "failed") {
        setState((s) => ({ ...s, error: `Prediction failed for ${ticker}`, active: null }))
        return
      }
      if (json.state === "succeeded") {
        if (activeRef.current?.ticker !== ticker) return
        setState((s) => ({ ...s, forecast: json.result, active: null }))
        return
      }
    }
    setState((s) => ({ ...s, error: `Prediction failed for ${ticker}`, active: null }))
  }

  return <PredictionCtx.Provider value={{ ...state, run }}>{children}</PredictionCtx.Provider>
}

