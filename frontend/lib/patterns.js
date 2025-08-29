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

export function computeInsights(dets, future = null, combinedTrend = null) {
  const bullishSet = new Set(["Head and shoulders bottom", "W_Bottom"]);
  const bearishSet = new Set(["Head and shoulders top", "M_Head"]);
  const neutralSet = new Set(["Triangle", "StockLine"]);

  let bullish = 0,
    bearish = 0;
  for (const d of dets) {
    if (bullishSet.has(d.label)) bullish++;
    if (bearishSet.has(d.label)) bearish++;
  }

  const hasDetections = dets.length > 0;
  const neutralOnly = hasDetections && dets.every((d) => neutralSet.has(d.label));

  let patternTrend = "Not found";
  if (!neutralOnly && hasDetections) {
    if (bullish > 0 && bearish === 0) patternTrend = "Bullish";
    else if (bearish > 0 && bullish === 0) patternTrend = "Bearish";
    else if (bullish > 0 && bearish > 0) patternTrend = "Mixed";
  }

  let trend = combinedTrend ?? patternTrend;
  const futureDir = future?.direction ?? "Not found";
  if (futureDir !== "Not found") {
    if (patternTrend === "Bullish" && futureDir === "Down") trend = "Mixed";
    else if (patternTrend === "Bearish" && futureDir === "Up") trend = "Mixed";
    else if (futureDir === "Up") trend = "Bullish";
    else if (futureDir === "Down") trend = "Bearish";
  }

  let signal = "N/A";
  let risk = "N/A";
  if (trend !== "Not found") {
    const strong = dets.some((d) => d.conf >= 0.75) || (future?.conf ?? 0) >= 0.75;
    signal = "Watch";
    if (strong && trend === "Bullish") signal = "Add to Watchlist";
    if (strong && trend === "Bearish") signal = "Reduce";
    const n = dets.length;
    risk = n <= 1 ? "Low" : n === 2 ? "Medium" : "High";
  }

  return {
    trend,
    signal,
    risk,
    volume: "Not inferred",
    hasDetections,
    neutralOnly,
    patternTrend,
    future: futureDir,
    count: dets.length,
  };
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
