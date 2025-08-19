import { fetchWithTimeout } from '@/lib/http'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(req, { params }) {
  const { ticker } = params
  const symbol = ticker?.toUpperCase()
  if (!symbol) {
    return new Response(JSON.stringify({ error: 'invalid ticker' }), { status: 400 })
  }
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || '1y'
  const interval = searchParams.get('interval') || '1d'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`
  try {
    const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } })
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'upstream error' }), { status: 503 })
    }
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) {
      return new Response(JSON.stringify({ error: 'invalid ticker' }), { status: 400 })
    }
    const timestamps = result.timestamp || []
    const quote = result.indicators?.quote?.[0] || {}
    const series = timestamps.map((ts, i) => ({
      t: new Date(ts * 1000).toISOString().split('T')[0],
      c: quote.close?.[i] ?? null,
      o: quote.open?.[i] ?? null,
      h: quote.high?.[i] ?? null,
      l: quote.low?.[i] ?? null,
      v: quote.volume?.[i] ?? null,
    })).filter(p => p.c != null)
    const payload = { ticker: symbol, range, interval, series }
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
