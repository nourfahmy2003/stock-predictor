import { NextResponse } from "next/server";
import Fuse from "fuse.js";
import { getUsSymbols, getCryptoSymbols } from "@/lib/symbols";

export const revalidate = 3600;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 200);
  const cursor = parseInt(searchParams.get("cursor") || "0", 10);
  const [us, crypto] = await Promise.all([getUsSymbols(), getCryptoSymbols()]);
  const data = [...us, ...crypto];
  const fuse = new Fuse(data, {
    keys: [
      { name: "symbol", weight: 0.7 },
      { name: "name", weight: 0.3 },
    ],
    threshold: 0.3,
  });
  const results = fuse.search(q);
  const total = results.length;
  const sliced = results.slice(cursor, cursor + limit).map((r) => r.item);
  const nextCursor = cursor + limit < total ? cursor + limit : null;
  const headers = { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" };
  return NextResponse.json({ q, total, limit, items: sliced, nextCursor }, { headers });
}
