import yf from "yahoo-finance2"
export const dynamic = "force-dynamic"

export async function GET(_, { params }) {
  const t = decodeURIComponent(params.ticker)
  try {
    const q = await yf.quote(t)
    const payload = {
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      dayLow: q.regularMarketDayLow,
      dayHigh: q.regularMarketDayHigh,
      previousClose: q.regularMarketPreviousClose,
      currency: q.currency,
      marketState: q.marketState,
    }
    return Response.json(payload, { status: 200 })
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
