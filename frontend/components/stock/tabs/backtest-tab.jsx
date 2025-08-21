"use client"

import { useState } from "react"
import { BarChart3 } from "lucide-react"
import { MetricBox } from "@/components/stock/metric-box"
import { ChartWrapper } from "@/components/stock/chart-wrapper"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { api } from "@/lib/api"

export function BacktestTab({ ticker }) {
  const [lookBack, setLookBack] = useState(60)
  const [horizon, setHorizon] = useState(10)
  const [start, setStart] = useState("2020-01-01")
  const [end, setEnd] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  async function run(e) {
    e.preventDefault()
    if (!ticker) return
    setLoading(true)
    setErr(null)
    try {
      const params = new URLSearchParams({
        ticker,
        look_back: String(lookBack),
        horizon: String(horizon),
        start,
      })
      if (end) params.append("end", end)
      const res = await api(`/backtest?${params.toString()}`)
      setResult(res)
    } catch (e) {
      setErr(e)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const metrics = result?.metrics || {}
  const data = result?.results || []

  return (
    <div className="space-y-6 relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <div className="w-48">
            <div className="h-2 bg-muted rounded">
              <div className="h-full w-3/4 animate-pulse bg-primary rounded" />
            </div>
          </div>
        </div>
      )}

      <form onSubmit={run} className="flex flex-wrap items-end gap-2 text-sm">
        <div className="flex flex-col">
          <label>Look Back</label>
          <input
            type="number"
            value={lookBack}
            onChange={(e) => setLookBack(Number(e.target.value))}
            className="px-2 py-1 rounded border bg-background"
          />
        </div>
        <div className="flex flex-col">
          <label>Horizon</label>
          <input
            type="number"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="px-2 py-1 rounded border bg-background"
          />
        </div>
        <div className="flex flex-col">
          <label>Start</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="px-2 py-1 rounded border bg-background"
          />
        </div>
        <div className="flex flex-col">
          <label>End</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="px-2 py-1 rounded border bg-background"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded bg-primary text-primary-foreground">
          Run Backtest
        </button>
      </form>

      {!result && !loading && (
        <div className="text-sm text-muted-foreground">No backtest yet, select parameters to run one.</div>
      )}

      {err && <div className="text-sm text-red-500">{String(err.message || err)}</div>}

      {result && (
        <>
          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4 flex items-center gap-2 text-white">
              <BarChart3 className="size-5 text-primary" />
              Backtest Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricBox label="RMSE" value={metrics.rmse?.toFixed?.(2) ?? "0"} format="number" />
              <MetricBox label="MAPE" value={metrics.mape?.toFixed?.(2) ?? "0"} format="number" />
              <MetricBox label="Sharpe" value={metrics.sharpe?.toFixed?.(2) ?? "0"} format="number" />
              <MetricBox
                label="Cumulative Return"
                value={metrics.cumulative_return ? (metrics.cumulative_return * 100).toFixed(2) : "0"}
                format="percentage"
              />
            </div>
          </div>

          <ChartWrapper title="Predicted vs Actual" loading={false}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="pred"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </>
      )}
    </div>
  )
}
