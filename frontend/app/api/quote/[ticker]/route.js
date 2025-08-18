import { NextResponse } from 'next/server';
import yf from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const t = decodeURIComponent(params.ticker);
  try {
    const q = await yf.quote(t);
    const payload = {
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      volume: q.regularMarketVolume,
      marketCap: q.marketCap,
      dayLow: q.regularMarketDayLow,
      dayHigh: q.regularMarketDayHigh,
      previousClose: q.regularMarketPreviousClose,
      currency: q.currency,
      marketState: q.marketState,
    };
    return NextResponse.json(payload, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
