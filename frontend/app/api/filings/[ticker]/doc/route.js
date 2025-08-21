import { tickerToCik, secFetch, buildFilingUrl, sleep } from "@/lib/sec";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const ticker = params.ticker?.toUpperCase();
  const { searchParams } = new URL(req.url);
  const accession = searchParams.get("accession");
  if (!ticker || !accession) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }
  try {
    const cik = await tickerToCik(ticker);
    if (!cik) return Response.json({ error: "CIK not found" }, { status: 404 });
    const data = await secFetch(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const recent = data.filings?.recent;
    let primaryDoc = null;
    if (recent) {
      const idx = recent.accessionNumber.findIndex((a) => a === accession);
      if (idx >= 0) primaryDoc = recent.primaryDocument[idx];
    }
    await sleep(400);
    let text = null;
    if (primaryDoc) {
      const txtUrl = buildFilingUrl(cik, accession, `${accession}.txt`);
      try {
        text = await secFetch(txtUrl, { type: "text" });
      } catch (e) {
        const htmlUrl = buildFilingUrl(cik, accession, primaryDoc);
        const html = await secFetch(htmlUrl, { type: "text", headers: { Accept: "text/html" } });
        text = html.replace(/<[^>]+>/g, " ");
      }
    }
    if (!text) return Response.json({ error: "document not found" }, { status: 404 });
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "s-maxage=86400" },
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
