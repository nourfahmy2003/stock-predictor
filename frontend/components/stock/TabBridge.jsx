"use client"

import { useEffect, useRef } from "react"
import { usePredictionJob, usePredictionStore } from "./prediction-store"

export default function TabBridge({ ticker }) {
  const { clearJob, updateStatus, setResult, setError } = usePredictionStore()
  const job = usePredictionJob(ticker)
  const prevTicker = useRef(ticker)
  const pollingRef = useRef()

  useEffect(() => {
    const old = prevTicker.current
    if (old !== ticker) {
      clearInterval(pollingRef.current)
      clearJob(old)
      prevTicker.current = ticker
    }
  }, [ticker, clearJob])

  useEffect(() => {
    if (!job || job.state === "done" || job.state === "error") {
      return
    }
    let active = true
    async function poll() {
      try {
        const res = await fetch(`/api/forecast/status?jobId=${job.jobId}`)
        if (!res.ok) throw new Error("status")
        const json = await res.json()
        updateStatus(ticker, json)
        if (json.state === "done") {
          const r = await fetch(`/api/forecast/result?jobId=${job.jobId}`)
          if (r.ok) {
            const result = await r.json()
            setResult(ticker, result)
          } else {
            setError(ticker, "result")
          }
          return
        }
      } catch (e) {
        setError(ticker, String(e))
        return
      }
      if (active) {
        pollingRef.current = setTimeout(poll, 500)
      }
    }
    poll()
    return () => {
      active = false
      clearTimeout(pollingRef.current)
    }
  }, [job, ticker, updateStatus, setResult, setError])

  return null
}
