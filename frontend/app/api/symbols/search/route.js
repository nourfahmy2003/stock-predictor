import { NextResponse } from "next/server";
import Fuse from "fuse.js";
import { getUsSymbols, getCryptoSymbols } from "@/lib/symbols";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "200", 10),
    200,
  );
  const cursor = parseInt(searchParams.get("cursor") || "0", 10);

  const [us, crypto] = await Promise.all([getUsSymbols(), getCryptoSymbols()]);
  let partial = false;
  const map = new Map();
  if (us) {
    us.forEach((it) => map.set(it.symbol, it));
  } else {
    partial = true;
  }
  if (crypto) {
    crypto.forEach((it) => {
      if (!map.has(it.symbol)) map.set(it.symbol, it);
    });
  } else {
    partial = true;
  }

  const headers = {
    "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
  };

  if (map.size === 0) {
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 503, headers },
    );
  }

  const data = Array.from(map.values());
  const cache = globalThis.__SYMBOLS_CACHE__;
  let fuseCache = globalThis.__FUSE__;
  if (
    !fuseCache ||
    Date.now() - fuseCache.ts > 3600_000 ||
    fuseCache.cacheTs !== (cache?.ts || 0)
  ) {
    fuseCache = {
      fuse: new Fuse(data, {
        keys: [
          { name: "symbol", weight: 0.7 },
          { name: "name", weight: 0.3 },
        ],
        threshold: 0.3,
      }),
      ts: Date.now(),
      cacheTs: cache?.ts || 0,
    };
    globalThis.__FUSE__ = fuseCache;
  }

  const results = fuseCache.fuse.search(q);
  const total = results.length;
  const sliced = results.slice(cursor, cursor + limit).map((r) => r.item);
  const nextCursor = cursor + limit < total ? String(cursor + limit) : null;

  return NextResponse.json(
    { q, total, limit, items: sliced, nextCursor, partial },
    { headers },
  );
}
