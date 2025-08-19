import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { clearSymbolsCache } from "@/lib/symbols";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  clearSymbolsCache();
  revalidateTag("symbols");
  return NextResponse.json({ revalidated: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
