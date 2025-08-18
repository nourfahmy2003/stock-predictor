export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") ?? "AAPL";
  const look_back = searchParams.get("look_back") ?? "60";
  const horizon = searchParams.get("horizon") ?? "10";
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  const url = `${base}/forecast?ticker=${encodeURIComponent(ticker)}&look_back=${look_back}&horizon=${horizon}`;
  const res = await fetch(url, { cache: "no-store" });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
