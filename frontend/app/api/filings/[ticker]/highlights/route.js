import { tickerToCik, secFetch, buildFilingUrl } from "@/lib/sec";

export const runtime = "nodejs";

function extract(text, regex) {
  const m = regex.exec(text);
  if (!m) return null;
  const start = m.index;
  const excerpt = text.slice(start, start + 600);
  return { excerpt, index: start };
}

export async function GET(req, { params }) {
  const ticker = params.ticker?.toUpperCase();
  const { searchParams } = new URL(req.url);
  const accession = searchParams.get("accession");
  if (!ticker || !accession) return Response.json({ error: "missing params" }, { status: 400 });
  try {
    const cik = await tickerToCik(ticker);
    if (!cik) return Response.json({ error: "CIK not found" }, { status: 404 });
    const txtUrl = buildFilingUrl(cik, accession, `${accession}.txt`);
    const text = await secFetch(txtUrl, { type: "text" });
    const res = {
      mdna: extract(text, /management[’'`]?s\s+discussion/i),
      risks: extract(text, /risk\s+factors/i),
      liquidity: extract(text, /liquidity\s+and\s+capital\s+resources/i),
      business: extract(text, /^\s*business\b/i),
    };
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "s-maxage=3600" },
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
