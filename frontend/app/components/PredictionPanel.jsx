"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function PredictionPanel() {
  const [ticker, setTicker] = useState("AAPL")
  const [lookBack, setLookBack] = useState(60)
  const [horizon, setHorizon] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  async function run() {
    try {
      setLoading(true)
      setError(null)
      setData(null)
      const qs = new URLSearchParams({
        ticker,
        look_back: String(lookBack),
        horizon: String(horizon),
      })
      const res = await fetch(`/api/forecast?${qs.toString()}`)
      if (!res.ok) {
        setError(`HTTP ${res.status}`)
        return
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const rows = data?.forecast?.slice(0, 10) ?? []

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

      {loading && <p>Loading…</p>}
      {error && <p className="text-danger">{error}</p>}

      {rows.length > 0 && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-right p-2">Predicted Price</th>
              <th className="text-right p-2">Predicted Return (%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="p-2">
                  {r?.date ? new Date(r.date).toLocaleDateString() : "-"}
                </td>
                <td className="p-2 text-right">
                  {r?.pred_price !== null && r?.pred_price !== undefined
                    ? Number(r.pred_price).toFixed(2)
                    : "-"}
                </td>
                <td className="p-2 text-right">
                  {r?.pred_return !== null && r?.pred_return !== undefined
                    ? (Number(r.pred_return) * 100).toFixed(2) + "%"
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
