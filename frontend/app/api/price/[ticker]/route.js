import { NextResponse } from "next/server"

export async function GET(req, { params }) {
  const ticker = params.ticker?.toLowerCase()
  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 })
  }
  try {
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(ticker)}&i=d`
    const res = await fetch(url)
    if (!res.ok) throw new Error("Bad response")
    const csv = await res.text()
    if (!csv.includes("Date,Open,High,Low,Close,Volume")) throw new Error("Unexpected body")
    const lines = csv.trim().split("\n").slice(1)
    const recent = lines.slice(-365)
    const series = recent
      .map((line) => {
        const [date, open, high, low, close, volume] = line.split(",")
        return {
          date,
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseFloat(volume),
        }
      })
      .filter((r) => r.date && !Number.isNaN(r.close))
    const headers = { "Cache-Control": "s-maxage=900, stale-while-revalidate=86400" }
    return NextResponse.json({ ticker: ticker.toUpperCase(), series }, { status: 200, headers })
  } catch (e) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 })
  }
}
