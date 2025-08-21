import { tickerToCik, secFetch } from "@/lib/sec";

export const runtime = "nodejs";

export async function GET(_, { params }) {
  const ticker = params.ticker?.toUpperCase();
  if (!ticker) return Response.json({ error: "missing ticker" }, { status: 400 });
  try {
    const cik = await tickerToCik(ticker);
    if (!cik) return Response.json({ error: "CIK not found" }, { status: 404 });
    const data = await secFetch(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const payload = {
      ticker,
      cik,
      name: data.entityName || data.name || data?.companyName,
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "s-maxage=86400" },
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
