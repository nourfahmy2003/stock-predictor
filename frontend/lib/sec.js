const SEC_UA = process.env.SEC_UA || "stock-predictor app";
const SEC_BASE = "https://data.sec.gov";

import cikMap from "./cik-map.json" assert { type: "json" };

export async function secFetch(url, opts = {}) {
  const { type = "json", headers = {}, ...rest } = opts;
  const res = await fetch(url, {
    ...rest,
    headers: {
      "User-Agent": SEC_UA,
      Accept: type === "text" ? "text/plain" : "application/json",
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`SEC request failed: ${res.status}`);
  return type === "text" ? res.text() : res.json();
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function tickerToCik(ticker) {
  const t = ticker.toUpperCase();
  if (cikMap[t]) return cikMap[t];
  // attempt to fetch via companyfacts search by ticker
  try {
    const data = await secFetch(`${SEC_BASE}/api/xbrl/companyfacts/${t}.json`);
    if (data?.cik) {
      const cik = String(data.cik).padStart(10, "0");
      return cik;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function buildFilingUrl(cik, accession, file) {
  const cikNum = parseInt(cik, 10).toString();
  const accNo = accession.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNo}/${file}`;
}
