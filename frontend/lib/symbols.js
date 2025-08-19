import { readFile } from "node:fs/promises";

const NASDAQ_URL =
  "https://ftp.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt";
const OTHER_URL =
  "https://ftp.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";
const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/list?include_platform=false";

const NASDAQ_FILE = process.env.NASDAQ_SYMBOLS_FILE;
const OTHER_FILE = process.env.OTHERLISTED_SYMBOLS_FILE;
const FETCH_TIMEOUT = 5000;

async function loadText(url, file) {
  if (file) {
    return readFile(file, "utf8");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function getUsSymbols() {
  if (globalThis.__usSymbols) return globalThis.__usSymbols;
  try {
    const [nasdaqTxt, otherTxt] = await Promise.all([
      loadText(NASDAQ_URL, NASDAQ_FILE),
      loadText(OTHER_URL, OTHER_FILE),
    ]);
    const map = new Map();
    const parseNasdaq = () => {
      const lines = nasdaqTxt.trim().split("\n").slice(1);
      for (const line of lines) {
        const [symbol, name, , test, , , etf] = line.split("|");
        if (!symbol || test === "Y") continue;
        const type = etf === "Y" ? "etf" : "stock";
        map.set(symbol, { symbol, name, exchange: "NASDAQ", type });
      }
    };
    const parseOther = () => {
      const lines = otherTxt.trim().split("\n").slice(1);
      for (const line of lines) {
        const [symbol, name, exchange, , etf, , test] = line.split("|");
        if (!symbol || test === "Y") continue;
        const type = etf === "Y" ? "etf" : "stock";
        if (!map.has(symbol)) {
          map.set(symbol, { symbol, name, exchange, type });
        }
      }
    };
    parseNasdaq();
    parseOther();
    const arr = Array.from(map.values());
    globalThis.__usSymbols = arr;
    return arr;
  } catch (err) {
    console.error("Failed to fetch US symbols", err);
    throw new Error("US_SYMBOLS_UNAVAILABLE");
  }
}

async function getCryptoSymbols() {
  if (globalThis.__cryptoSymbols) return globalThis.__cryptoSymbols;
  const res = await fetch(COINGECKO_URL);
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
  globalThis.__cryptoSymbols = arr;
  return arr;
}

export { getUsSymbols, getCryptoSymbols };
