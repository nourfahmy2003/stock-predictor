import { NextResponse } from "next/server";
import { getCryptoSymbols } from "@/lib/symbols";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const items = await getCryptoSymbols();
  const headers = {
    "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
  };
  if (!items) {
    return NextResponse.json({ error: "upstream_unavailable" }, {
      status: 503,
      headers,
    });
  }
  return NextResponse.json({ items }, { headers });
}
