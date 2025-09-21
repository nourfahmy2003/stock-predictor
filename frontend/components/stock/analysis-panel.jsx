"use client";

import { useMemo, useState } from "react";
import { BarChart3, RefreshCcw, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/loader";
import { MetricBox } from "@/components/stock/metric-box";
import { useAnalysisReport } from "./use-analysis-report";
import { cn } from "@/lib/utils";

const SUPPORTED_INTERVALS = ["1m", "5m", "15m", "30m", "60m"];

const INDICATOR_LABELS = [
  ["ma_text", "Moving Averages"],
  ["macd_text", "MACD"],
  ["boll_text", "Bollinger Bands"],
  ["rsi_text", "RSI"],
  ["stoch_text", "Stochastic"],
  ["adx_text", "ADX"],
  ["vwap_text", "VWAP"],
  ["atr_text", "ATR"],
  ["obv_text", "OBV"],
];

function formatAsOf(asOf) {
  if (!asOf) return "";
  const dt = new Date(asOf);
  if (Number.isNaN(dt.getTime())) return String(asOf);

  const localOptions = {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  };
  const localFormatter = new Intl.DateTimeFormat(undefined, localOptions);
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  const localStr = localFormatter.format(dt);

  const nyFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
  const nyStr = nyFormatter.format(dt);

  return `${localStr} (${localTz}) • NYSE ${nyStr}`;
}

function directionVariant(direction) {
  switch (direction) {
    case "Long":
      return "default";
    case "Short":
      return "destructive";
    default:
      return "secondary";
  }
}

function trendBadgeVariant(trend) {
  if (trend === "Bullish") return "default";
  if (trend === "Bearish") return "destructive";
  return "secondary";
}

export function AnalysisPanel({ symbol, defaultInterval = "5m" }) {
  const [interval, setInterval] = useState(
    SUPPORTED_INTERVALS.includes(defaultInterval) ? defaultInterval : "5m"
  );

  const { state, report, error, refresh } = useAnalysisReport(symbol, interval);

  const loading = state === "idle" || state === "loading";
  const hasData = Boolean(report);
  const titleSymbol = symbol ? symbol.toUpperCase() : "--";

  const trendDetails = useMemo(() => report?.debug?.trend_details || {}, [report]);
  const voteSummary = useMemo(
    () => ({
      bull: trendDetails?.bull_votes ?? null,
      bear: trendDetails?.bear_votes ?? null,
      gate: trendDetails?.gate ?? report?.trend ?? null,
      adx: trendDetails?.adx ?? null,
    }),
    [trendDetails, report]
  );

  const pivotEntries = useMemo(() => {
    const levels = report?.levels || {};
    const order = ["S3", "S2", "S1", "P", "R1", "R2", "R3"];
    return order
      .map((key) => ({ key, value: levels[key] }))
      .filter((entry) => entry.value !== undefined && entry.value !== null);
  }, [report]);

  const indicatorEntries = useMemo(() => {
    const texts = report?.indicators || {};
    return INDICATOR_LABELS.map(([key, label]) => ({
      key,
      label,
      text: texts[key] || "unavailable / skipped",
    }));
  }, [report]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <h3 className="text-lg font-heading font-semibold">Trend & Tactical Analysis</h3>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="analysis-interval">
            Interval
          </label>
          <select
            id="analysis-interval"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={interval}
            onChange={(event) => setInterval(event.target.value)}
          >
            {SUPPORTED_INTERVALS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading && !hasData}
            className="flex items-center gap-2"
          >
            <RefreshCcw className={cn("size-4", loading && !hasData ? "animate-spin" : "")} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Failed to load analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {String(error.message || error)}
          </CardContent>
        </Card>
      )}

      {loading && !hasData && (
        <div className="grid place-items-center py-24">
          <Loader size={220} />
        </div>
      )}

      {hasData && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <TrendingUp className="size-5 text-primary" />
                {titleSymbol} • {report?.interval ?? interval}
              </CardTitle>
              <Badge variant={trendBadgeVariant(report.trend)} className="text-sm">
                {report.trend}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricBox label="Last Price" value={Number(report.price ?? 0)} format="currency" />
                <MetricBox
                  label="Bull Votes"
                  value={voteSummary.bull ?? "--"}
                  format="number"
                />
                <MetricBox
                  label="Bear Votes"
                  value={voteSummary.bear ?? "--"}
                  format="number"
                />
                <MetricBox
                  label="ADX"
                  value={voteSummary.adx ?? "--"}
                  format="number"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>As of {formatAsOf(report.as_of)}</span>
                {voteSummary.gate && <span>• ADX gate: {voteSummary.gate}</span>}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Indicator Narratives</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {indicatorEntries.map(({ key, label, text }) => (
                  <div key={key} className="rounded-lg border bg-muted/10 p-4">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pivot Levels</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                {pivotEntries.map(({ key, value }) => (
                  <div key={key} className="flex flex-col rounded-md border border-border/40 bg-muted/10 p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{key}</span>
                    <span className="text-base font-semibold">
                      {value != null ? Number(value).toFixed(2) : "--"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Trade Plan</CardTitle>
              <Badge variant={directionVariant(report.decision?.direction || "Neutral")}>
                {report.decision?.direction || "Neutral"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {report.decision?.rationale?.length ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Rationale</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {report.decision.rationale.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.decision?.entry_zone && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Entry</p>
                  <p className="text-foreground">{report.decision.entry_zone}</p>
                </div>
              )}

              {report.decision?.stop_loss && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Stop</p>
                  <p className="text-foreground">{report.decision.stop_loss}</p>
                </div>
              )}

              {report.decision?.targets?.length ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Targets</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {report.decision.targets.map((target) => (
                      <li key={target}>{target}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.decision?.risk_note && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk Note</p>
                  <p className="text-foreground">{report.decision.risk_note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AnalysisPanel;
