import { fetchWithTimeout } from '@/lib/http'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(req, { params }) {
  const { ticker } = params
  const symbol = ticker?.toUpperCase()
  if (!symbol) {
    return new Response(JSON.stringify({ error: 'invalid ticker' }), {
      status: 400,
    })
  }

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,summaryDetail,defaultKeyStatistics`

  try {
    const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } })
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'upstream error' }), { status: 503 })
    }
    const json = await res.json()
    const result = json?.quoteSummary?.result?.[0]
    if (!result) {
      return new Response(JSON.stringify({ error: 'invalid ticker' }), { status: 400 })
    }

    const price = result.price || {}
    const summary = result.summaryDetail || {}
    const stats = result.defaultKeyStatistics || {}

    const payload = {
      ticker: symbol,
      price: price.regularMarketPrice?.raw ?? null,
      change: price.regularMarketChange?.raw ?? null,
      changePercent: price.regularMarketChangePercent?.raw ?? null,
      currency: price.currency || 'USD',
      volume: summary.volume?.raw ?? price.regularMarketVolume?.raw ?? null,
      marketCap: summary.marketCap?.raw ?? null,
      peRatio: summary.trailingPE?.raw ?? stats.trailingPE?.raw ?? null,
      dayLow: price.regularMarketDayLow?.raw ?? null,
      dayHigh: price.regularMarketDayHigh?.raw ?? null,
      regularMarketTime: price.regularMarketTime?.raw ?? null,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=120, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'upstream failure' }), { status: 503 })
  }
}
