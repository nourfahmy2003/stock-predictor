"use client"

import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import PredictionChart from "@/components/stock/PredictionChart"

export default function PredictionPanel() {
  const [ticker, setTicker] = useState("AAPL")
  const [lookBack, setLookBack] = useState(60)
  const [horizon, setHorizon] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const abortRef = useRef(null)

  async function run() {
    try {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams({
        ticker,
        look_back: String(lookBack),
        horizon: String(horizon),
      })
      const res = await fetch(`/api/forecast?${qs.toString()}`, {
        signal: controller.signal,
      })
      if (!res.ok) {
        setError(`HTTP ${res.status}`)
        return
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      if (e.name !== "AbortError") setError(String(e))
    } finally {
      setLoading(false)
    }
  }
  const rows = (data?.forecast ?? []).map((r) => ({
    date: new Date(r.date).toLocaleDateString(),
    pred_price: r.pred_price ?? null,
    pred_return: r.pred_return ?? null,
  }))

  return (
    <div className="max-w-3xl mx-auto my-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <Input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker e.g. AAPL or BTC-USD"
        />
        <Input
          type="number"
          value={lookBack}
          onChange={(e) => setLookBack(parseInt(e.target.value || "60"))}
        />
        <Input
          type="number"
          value={horizon}
          onChange={(e) => setHorizon(parseInt(e.target.value || "10"))}
        />
        <Button onClick={run} disabled={loading}>
          Run AI Prediction
        </Button>
      </div>

      {loading && <p>Running model…</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && rows.length > 0 && <PredictionChart data={rows} />}
    </div>
  )
}
