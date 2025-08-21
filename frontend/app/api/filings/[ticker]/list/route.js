import { tickerToCik, secFetch, buildFilingUrl } from "@/lib/sec";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const ticker = params.ticker?.toUpperCase();
  if (!ticker) return Response.json({ error: "missing ticker" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const typesParam = searchParams.get("types") || "";
  const types = typesParam.split(",").map((t) => t.trim()).filter(Boolean);
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  try {
    const cik = await tickerToCik(ticker);
    if (!cik) return Response.json({ error: "CIK not found" }, { status: 404 });
    const data = await secFetch(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const recent = data.filings?.recent;
    if (!recent) return Response.json([], { status: 200 });
    const results = [];
    for (let i = 0; i < recent.form.length && results.length < limit; i++) {
      const form = recent.form[i];
      if (types.length && !types.includes(form)) continue;
      const accession = recent.accessionNumber[i];
      const filed = recent.filingDate[i];
      const period = recent.reportDate[i];
      const primaryDoc = recent.primaryDocument[i];
      const size = recent.size[i];
      const url = buildFilingUrl(cik, accession, primaryDoc);
      const urlTxt = buildFilingUrl(cik, accession, `${accession}.txt`);
      results.push({
        type: form,
        filed,
        period,
        accession,
        url,
        urlHtml: url,
        urlTxt,
        size,
      });
    }
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "s-maxage=3600" },
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
