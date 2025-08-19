"use client"
import { useEffect, useState } from "react"
import { API } from "@/lib/api"
import { StatCard } from "@/components/ui/stat-card"

export function OverviewSection({ ticker }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const r = await API(`/overview/${ticker}`)
      if (!r.ok) throw new Error("overview failed")
      setData(await r.json())
    } catch (e) {
      setErr(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticker) load()
  }, [ticker])

  if (loading) return <div className="text-sm opacity-70">Loading quote…</div>
  if (err)
    return (
      <div className="text-sm text-red-500">
        Failed to load. <button className="underline" onClick={load}>Retry</button>
      </div>
    )
  if (!data) return null

  const { price, changePercent, volume, peRatio, dayRange, marketCap, currency } = data

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Price" value={`${price?.toFixed?.(2) ?? "—"} ${currency ?? ""}`} />
      <StatCard
        label="Market Cap"
        value={marketCap ? Intl.NumberFormat("en", { notation: "compact" }).format(marketCap) : "—"}
      />
      <StatCard label="P/E Ratio" value={peRatio ?? "—"} />
      <StatCard
        label="Day Range"
        value={
          dayRange?.low && dayRange?.high
            ? `${dayRange.low.toFixed(2)} - ${dayRange.high.toFixed(2)}`
            : "—"
        }
      />
    </div>
  )
}

