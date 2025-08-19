import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(_req, { params }) {
  try {
    const t = String(params.ticker || "").toUpperCase();

    const { price, summaryDetail, defaultKeyStatistics } =
      await yahooFinance.quoteSummary(t, {
        modules: ["price", "summaryDetail", "defaultKeyStatistics"],
      });

    const nowPrice = price?.regularMarketPrice ?? null;
    const change = price?.regularMarketChange ?? null;
    const changePct = price?.regularMarketChangePercent ?? null;
    const volume = price?.regularMarketVolume ?? summaryDetail?.volume ?? null;
    const peRatio =
      summaryDetail?.trailingPE ?? defaultKeyStatistics?.trailingPE ?? null;
    const dayLow = price?.regularMarketDayLow ?? summaryDetail?.dayLow ?? null;
    const dayHigh = price?.regularMarketDayHigh ?? summaryDetail?.dayHigh ?? null;
    const marketCap = price?.marketCap ?? summaryDetail?.marketCap ?? null;
    const currency = price?.currency ?? null;
    const asOf = price?.regularMarketTime ?? Date.now();

    return NextResponse.json(
      {
        ticker: t,
        price: nowPrice,
        change,
        changePercent: changePct,
        volume,
        peRatio,
        marketCap,
        dayRange: { low: dayLow, high: dayHigh },
        currency,
        asOf,
      },
      { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("overview route error:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 503 });
  }
}
