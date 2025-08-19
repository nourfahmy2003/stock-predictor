import { fetchWithTimeout } from "./http";

const NASDAQ_URLS = [
  "https://ftp.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt",
  "https://static.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt",
];

const OTHER_URLS = [
  "https://ftp.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt",
  "https://static.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt",
];

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/list?include_platform=false";

const CACHE_TTL = 3600_000;

function getCache() {
  const cache = globalThis.__SYMBOLS_CACHE__;
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache;
  return null;
}

function setCache(partial) {
  const existing = getCache() || {};
  globalThis.__SYMBOLS_CACHE__ = { ...existing, ...partial, ts: Date.now() };
}

async function fetchTextWithFallback(urls) {
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, { next: { tags: ["symbols"] } });
      if (res.ok) return await res.text();
    } catch (e) {
      // try next
    }
  }
  return null;
}

let pendingUsSymbols;

export async function getUsSymbols() {
  const cache = getCache();
  if (cache?.us) return cache.us;
  if (pendingUsSymbols) return pendingUsSymbols;

  pendingUsSymbols = (async () => {
    console.time("load_us_symbols");
    const [nasdaqTxt, otherTxt] = await Promise.all([
      fetchTextWithFallback(NASDAQ_URLS),
      fetchTextWithFallback(OTHER_URLS),
    ]);
    console.timeEnd("load_us_symbols");

    if (!nasdaqTxt || !otherTxt) return null;

    const map = new Map();
    nasdaqTxt
      .trim()
      .split("\n")
      .slice(1)
      .forEach((line) => {
        const [symbol, name, , test, , , etf] = line.split("|");
        if (!symbol || test === "Y") return;
        const type = etf === "Y" ? "etf" : "stock";
        map.set(symbol, { symbol, name, exchange: "NASDAQ", type });
      });
    otherTxt
      .trim()
      .split("\n")
      .slice(1)
      .forEach((line) => {
        const [symbol, name, exchange, , etf, , test] = line.split("|");
        if (!symbol || test === "Y") return;
        const type = etf === "Y" ? "etf" : "stock";
        if (!map.has(symbol)) map.set(symbol, { symbol, name, exchange, type });
      });
    const arr = Array.from(map.values());
    setCache({ us: arr });
    return arr;
  })();

  try {
    return await pendingUsSymbols;
  } finally {
    pendingUsSymbols = null;
  }
}

export async function getCryptoSymbols() {
  const cache = getCache();
  if (cache?.crypto) return cache.crypto;

  console.time("load_crypto_symbols");
  try {
    const res = await fetchWithTimeout(COINGECKO_URL, {
      next: { tags: ["symbols"] },
    });
    if (!res.ok) throw new Error("failed");
    const json = await res.json();
    const arr = json
      .filter((c) => c.symbol && c.id)
      .map((c) => ({
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        exchange: "Crypto",
        type: "crypto",
        id: c.id,
      }));
    setCache({ crypto: arr });
    console.timeEnd("load_crypto_symbols");
    return arr;
  } catch (e) {
    console.timeEnd("load_crypto_symbols");
    console.error("Failed to load crypto symbols", e);
    return null;
  }
}

export function clearSymbolsCache() {
  globalThis.__SYMBOLS_CACHE__ = undefined;
  globalThis.__FUSE__ = undefined;
}
