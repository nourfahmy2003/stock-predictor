export const FRIENDLY_LABELS = {
  "Head and shoulders top": "Bearish reversal. Left shoulder–Head–Right shoulder; neckline breaks down → downside target ≈ head-to-neckline distance.",
  "Head and shoulders bottom": "Bullish reversal (Inverse H&S). Breakout above neckline; target ≈ head-to-neckline distance.",
  "M_Head": "Bearish M-shape / double-top variant. Two peaks with a middle dip; breakdown confirms weakness.",
  "W_Bottom": "Bullish W-shape / double-bottom. Two troughs with a middle peak; breakout confirms strength.",
  "Triangle": "Consolidation (sym/asc/desc not distinguished). Breakout direction matters; use breakout candle + retest.",
  "StockLine": "Trendline segment (support/resistance). Breaks can signal continuation or reversal.",
};

export const NORMALIZE = {
  "head_and_shoulders": "Head and shoulders top",
  "head_and_shoulders_top": "Head and shoulders top",
  "head_and_shoulders_bottom": "Head and shoulders bottom",
  "m_head": "M_Head",
  "w_bottom": "W_Bottom",
  "triangle": "Triangle",
  "stockline": "StockLine",
};

export function computeInsights(dets) {
  const bullishSet = new Set(["Head and shoulders bottom", "W_Bottom"]);
  const bearishSet = new Set(["Head and shoulders top", "M_Head"]);
  let bullish = 0,
    bearish = 0;
  for (const d of dets) {
    if (bullishSet.has(d.label)) bullish++;
    if (bearishSet.has(d.label)) bearish++;
  }
  const trend = bullish && !bearish ? "Bullish" : bearish && !bullish ? "Bearish" : bullish || bearish ? "Mixed" : "Mixed";
  const strong = dets.some((d) => d.conf >= 0.75);
  let signal = "Watch";
  if (strong && bullish && !bearish) signal = "Add to Watchlist";
  if (strong && bearish && !bullish) signal = "Reduce";
  const n = dets.length;
  const risk = n <= 1 ? "Low" : n === 2 ? "Medium" : "High";
  return { trend, signal, risk, volume: "Not inferred" };
}

export function buildGamePlan(dets) {
  return {
    entryExit:
      "H&S: Entry on neckline break; stop above/below neckline; target ≈ head↔neckline. W/M patterns: confirm on breakout beyond middle swing; stops beneath/above last swing. Triangles: trade in breakout direction; prefer retest; invalidate on close back inside.",
    riskReward: "Prefer R:R ≥ 1.5:1; scale size down when signals conflict.",
    durationMonitoring:
      "Your uploaded chart interval is detected from the image; typical holding window aligns with that timescale.",
    indicators:
      "Optional confirmation: SMA20/50/200 alignment; RSI divergence; volume on breakout.",
    recognizedPatterns: dets.map((d) => ({
      label: d.label,
      conf: d.conf,
      meaning: FRIENDLY_LABELS[d.label] || "",
    })),
  };
}
