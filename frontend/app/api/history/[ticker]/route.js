import yf from "yahoo-finance2"
export const dynamic = "force-dynamic"

export async function GET(_, { params }) {
  const t = decodeURIComponent(params.ticker)
  try {
    const rows = await yf.historical(t, { period1: "90d", interval: "1d" })
    const data = rows.map((r) => ({ date: r.date?.toISOString?.() ?? "", close: r.close ?? null }))
    return Response.json({ symbol: t, data }, { status: 200 })
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
