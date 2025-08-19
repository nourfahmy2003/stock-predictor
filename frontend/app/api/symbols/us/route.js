import { NextResponse } from "next/server";
import { getUsSymbols } from "@/lib/symbols";

export const revalidate = 3600;

export async function GET() {
  try {
    const items = await getUsSymbols();
    const headers = { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" };
    return NextResponse.json({ items }, { headers });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load symbols" }, { status: 500 });
  }
}
