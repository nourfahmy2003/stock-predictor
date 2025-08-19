const NASDAQ_URL = "https://ftp.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt";
const OTHER_URL = "https://ftp.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";
const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/list?include_platform=false";

async function getUsSymbols() {
  if (globalThis.__usSymbols) return globalThis.__usSymbols;
  const [nasdaqRes, otherRes] = await Promise.all([
    fetch(NASDAQ_URL),
    fetch(OTHER_URL),
  ]);
  const [nasdaqTxt, otherTxt] = await Promise.all([
    nasdaqRes.text(),
    otherRes.text(),
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
