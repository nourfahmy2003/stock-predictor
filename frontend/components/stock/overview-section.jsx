"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useOverview } from "@/hooks/use-overview"

const currencyFormatter = (value, currency = "USD", fraction = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: fraction,
    }).format(Number(value))
  } catch (e) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: fraction })
  }
}

const compactNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(Number(value))
}

const clamp = (value, min = 0, max = 1) => {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

const SESSION_LABELS = {
  PREMARKET: "PRE-MARKET",
  "PRE-MARKET": "PRE-MARKET",
  PRE: "PRE-MARKET",
  OPEN: "OPEN",
  REGULAR: "OPEN",
  CONTINUOUS: "OPEN",
  POSTMARKET: "POST-MARKET",
  "POST-MARKET": "POST-MARKET",
  POST: "POST-MARKET",
  CLOSED: "CLOSED",
}

const normalizeSession = (value) => {
  if (!value) return "CLOSED"
  const key = String(value).toUpperCase()
  return SESSION_LABELS[key] || "CLOSED"
}

const KPI_TOKENS = {
  cardBase:
    "flex h-full min-h-[178px] w-full flex-col justify-between rounded-2xl border border-white/10 bg-zinc-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur",
  label: "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70",
  value: "truncate text-[20px] font-semibold leading-tight text-white",
  sublabel: "truncate text-xs text-muted-foreground/70",
  metaLabel: "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60",
  metaValue: "truncate text-sm leading-tight text-white/80",
  badge:
    "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80",
}

function DataDash({ label = "Not available" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex max-w-full cursor-default items-center text-muted-foreground">
          —
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function KpiCard({ label, value, sublabel, tooltip, labelAddon, valueClass, children, className }) {
  const hasValue = value !== null && value !== undefined && value !== ""
  const renderedValue = hasValue ? value : <DataDash />

  const valueNode = tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="max-w-full">
          {renderedValue}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  ) : (
    renderedValue
  )

  return (
    <div className={cn(KPI_TOKENS.cardBase, "space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className={KPI_TOKENS.label}>{label}</p>
          {labelAddon ?? null}
        </div>
        <div className={cn(KPI_TOKENS.value, valueClass)}>{valueNode}</div>
        {sublabel ? <p className={KPI_TOKENS.sublabel}>{sublabel}</p> : null}
      </div>
      {children ? <div className="mt-auto pt-1">{children}</div> : null}
    </div>
  )
}

function VolumeCard({ volume, avgVolume, session }) {
  const hasVolume = Number.isFinite(Number(volume))
  const hasAvg = Number.isFinite(Number(avgVolume)) && Number(avgVolume) > 0
  const ratio = hasAvg && hasVolume ? Number(volume) / Number(avgVolume) : null
  const ratioCapped = ratio !== null ? Math.min(ratio, 3) : null
  const gaugeFill = ratioCapped !== null ? Math.min(ratioCapped, 2) / 2 : 0
  const gaugeWidth = `${Math.max(0, Math.min(gaugeFill, 1)) * 100}%`
  const diffPct = ratio !== null ? (ratio - 1) * 100 : null
  const pillLabel = diffPct !== null ? `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}% vs avg` : "— vs avg"
  const tooltipText = hasAvg
    ? `Today: ${compactNumber(volume) || "—"} • 30-day avg: ${compactNumber(avgVolume) || "—"}`
    : `Today: ${compactNumber(volume) || "—"} • 30-day avg: Not available`
  const rangeDescription = hasAvg
    ? "Gauge spans 0 to 2× average volume with midpoint at the 30-day average."
    : "Gauge baseline unavailable because the 30-day average is missing."

  const sessionUpper = (session || "").toUpperCase()
  const statusBadges = [
    sessionUpper === "POST-MARKET" ? "AH" : null,
    sessionUpper === "PRE-MARKET" ? "Pre" : null,
  ].filter(Boolean)

  return (
    <KpiCard
      label="Volume"
      value={compactNumber(volume)}
      sublabel={hasAvg ? `Avg 30-day: ${compactNumber(avgVolume)}` : "Avg 30-day: —"}
      labelAddon={
        statusBadges.length ? (
          <div className="flex items-center gap-1">
            {statusBadges.map((badge) => (
              <Badge
                key={badge}
                className="rounded-full border border-white/15 bg-white/10 px-2 py-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80"
              >
                {badge}
              </Badge>
            ))}
          </div>
        ) : null
      }
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="relative"
            tabIndex={0}
            role="img"
            aria-label={`Volume gauge. ${tooltipText}. ${rangeDescription}`}
          >
            <div className="mb-2 flex justify-end">
              <span className={KPI_TOKENS.badge}>{pillLabel}</span>
            </div>
            <div className="relative h-2.5 w-full rounded-full bg-zinc-800/80">
              <div
                className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
                style={{ width: gaugeWidth }}
              >
                <div className="h-full w-full bg-gradient-to-r from-emerald-500/80 via-emerald-400/80 to-emerald-300/80" />
              </div>
              {hasAvg ? (
                <div
                  className="absolute inset-y-[-4px] left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-white/70"
                  aria-hidden
                />
              ) : null}
              {ratioCapped !== null && ratioCapped > 2 ? (
                <span className="absolute right-[-10px] top-1/2 -translate-y-1/2 text-sm text-white/70" aria-hidden>
                  ›
                </span>
              ) : null}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </KpiCard>
  )
}

function RangeCard({ label, low, high, value, currency }) {
  const lowNum = Number(low)
  const highNum = Number(high)
  const valueNum = Number(value)
  const lowFmt = currencyFormatter(low, currency)
  const highFmt = currencyFormatter(high, currency)
  const currentFmt = currencyFormatter(value, currency)

  const position = useMemo(() => {
    if (!Number.isFinite(lowNum) || !Number.isFinite(highNum) || !Number.isFinite(valueNum)) return null
    if (highNum === lowNum) return 0.5
    return clamp((valueNum - lowNum) / (highNum - lowNum))
  }, [highNum, lowNum, valueNum])

  const tooltipText = `${label} • Low: ${lowFmt ?? "—"} • High: ${highFmt ?? "—"} • Last: ${currentFmt ?? "—"}`
  const indicatorStyle = position !== null ? { left: `${position * 100}%` } : { left: "50%" }

  return (
    <KpiCard label={label} value={currentFmt} sublabel={`Range: ${lowFmt ?? "—"} – ${highFmt ?? "—"}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="relative"
            tabIndex={0}
            role="img"
            aria-label={`${label} gauge. ${tooltipText}`}
          >
            <div className="relative pt-6">
              <div className="absolute left-0 right-0 top-0 flex justify-between text-[11px] text-muted-foreground/70">
                <span>{lowFmt ?? "—"}</span>
                <span>{highFmt ?? "—"}</span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-zinc-800/80">
                {position !== null ? (
                  <span
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border border-white/70 bg-white"
                    style={{ left: `calc(${position * 100}% )` }}
                    aria-hidden
                  />
                ) : null}
              </div>
              <span
                className="absolute -top-2 -translate-x-1/2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white"
                style={indicatorStyle}
              >
                {currentFmt ?? "—"}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </KpiCard>
  )
}

function MetricCard({ label, value, sublabel, tooltip, className }) {
  return (
    <KpiCard label={label} value={value} sublabel={sublabel} tooltip={tooltip} className={className} />
  )
}

function DividendCardWide({
  currency,
  ttmDividend,
  lastDividend,
  lastDividendDate,
  lastDividendPayDate,
  exDividendDate,
  nextDividendDate,
  frequency,
  lastClose,
}) {
  const value = currencyFormatter(ttmDividend, currency)
  const hasDividend = Number(ttmDividend) > 0
  const formattedLastPaid = formatDate(lastDividendPayDate) ?? formatDate(lastDividendDate)
  const formattedExDate = formatDate(exDividendDate)
  const frequencyLabel = frequency ?? null
  const statusConfirmed = Boolean(nextDividendDate)

  const statusBadge = (
    <Badge className="rounded-full border border-white/15 bg-white/5 px-3 py-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85">
      {statusConfirmed ? "Confirmed" : "Pending"}
    </Badge>
  )

  const metaItems = [
    {
      key: "last-paid",
      label: "Last Paid",
      value: formattedLastPaid,
      tooltip: lastDividend ? `Amount: ${currencyFormatter(lastDividend, currency)}` : undefined,
    },
    {
      key: "ex-date",
      label: "Ex-Date",
      value: formattedExDate,
    },
    {
      key: "frequency",
      label: "Frequency",
      value: hasDividend ? frequencyLabel : null,
    },
    {
      key: "status",
      label: "Status",
      value: hasDividend ? statusBadge : null,
    },
  ]

  const footnote = hasDividend ? "TTM based on last close" : "No regular dividend"
  const topValue = value ?? <DataDash />

  return (
    <div className={cn(KPI_TOKENS.cardBase, "min-h-[236px] space-y-6")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className={KPI_TOKENS.label}>Dividend</p>
          <div className="text-[28px] font-semibold leading-tight text-white">{topValue}</div>
        </div>
        {hasDividend && lastDividend ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85"
              >
                Last payout {currencyFormatter(lastDividend, currency) ?? "—"}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formattedLastPaid ? `Paid on ${formattedLastPaid}` : "Most recent dividend amount"}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {metaItems.map(({ key, label: metaLabel, value: metaValue, tooltip: metaTooltip }) => (
          <div key={key} className="space-y-1">
            <p className={KPI_TOKENS.metaLabel}>{metaLabel}</p>
            {metaTooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className={KPI_TOKENS.metaValue}>
                    {metaValue ?? <DataDash />}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{metaTooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className={KPI_TOKENS.metaValue}>{metaValue ?? <DataDash />}</div>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground/70">
        {footnote}
        {hasDividend && lastClose ? ` • Last close ${currencyFormatter(lastClose, currency) ?? "—"}` : ""}
      </div>
    </div>
  )
}

function YieldCard({ dividendYield, lastClose, hasPrice, currency }) {
  const value = dividendYield !== null && dividendYield !== undefined ? `${dividendYield.toFixed(2)}%` : null
  const footnote = hasPrice ? "TTM based on last close" : "TTM based on previous close"

  return (
    <KpiCard label="Dividend Yield" value={value} sublabel={footnote}>
      <div className="space-y-2 text-sm text-muted-foreground/80">
        <div className="flex items-center justify-between">
          <span>Last close</span>
          <span>{currencyFormatter(lastClose, currency) ?? "—"}</span>
        </div>
      </div>
    </KpiCard>
  )
}

function PerformanceChips({ performance, currency }) {
  if (!performance || performance.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {performance.map((p) => {
        const pct = p.percent !== null && p.percent !== undefined ? p.percent * 100 : null
        const abs = p.absolute !== null && p.absolute !== undefined ? p.absolute : null
        const positive = pct > 0
        const negative = pct < 0
        const tone = positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-muted-foreground"
        const absFormatted = abs !== null ? currencyFormatter(abs, currency, 2) : "—"
        const pctFormatted = pct !== null ? `${pct.toFixed(1)}%` : "—"
        const tooltip = `From ${currencyFormatter(p.start, currency)} to ${currencyFormatter(p.end, currency)} (${pctFormatted}, ${absFormatted})`
        return (
          <Tooltip key={p.label}>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="rounded-full border border-white/5 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-white/80"
              >
                <span className="font-semibold">{p.label}</span> <span className={tone}>{pctFormatted}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function formatDate(value) {
  if (!value) return null
  try {
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return value
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  } catch (e) {
    return value
  }
}

export function OverviewSection({ ticker }) {
  const { data, err, loading, reload } = useOverview(ticker)

  const skeletonKeys = [
    "volume",
    "day",
    "week",
    "cap",
    "pe",
    "eps",
    "beta",
    "shares",
    "float",
    "dividend",
    "yield",
  ]

  if (loading && !data) {
    return (
      <div className="space-y-6 px-[5%]">
        <div className="grid grid-cols-12 gap-4">
          {skeletonKeys.map((key) => (
            <div key={key} className={cn("col-span-12", "md:col-span-6", "lg:col-span-4")}
            >
              <Skeleton className="h-[178px] w-full rounded-2xl bg-zinc-800/60" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[236px] w-full rounded-2xl bg-zinc-800/60" />
      </div>
    )
  }

  if (err) {
    return (
      <div className="px-[5%] text-sm text-red-500">
        Unable to load data —
        <button type="button" className="ml-1 underline" onClick={reload}>
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const {
    price,
    volume,
    avgVolume,
    dayRange,
    week52Range,
    currency,
    marketCap,
    peRatio,
    eps,
    beta,
    sharesOutstanding,
    floatShares,
    dividendTTM,
    lastDividend,
    lastDividendDate,
    lastDividendPayDate,
    exDividendDate,
    nextDividendDate,
    dividendFrequency,
    dividendYield,
    priceSession,
    lastClose,
    performance,
  } = data

  const sessionLabel = normalizeSession(priceSession)
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 px-[5%]">
        <PerformanceChips performance={performance} currency={currency} />
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <VolumeCard
              volume={volume}
              avgVolume={avgVolume}
              session={sessionLabel}
            />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <RangeCard label="Day Range" low={dayRange?.low} high={dayRange?.high} value={price} currency={currency} />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <RangeCard
              label="52 Week Range"
              low={week52Range?.low}
              high={week52Range?.high}
              value={price}
              currency={currency}
            />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <MetricCard label="Market Cap" value={compactNumber(marketCap)} sublabel={`${currency ?? "USD"}`} />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <MetricCard
              label="P/E"
              value={peRatio !== null && peRatio !== undefined ? peRatio.toFixed(2) : null}
              sublabel="Ratio"
            />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <MetricCard
              label="EPS"
              value={eps !== null && eps !== undefined ? currencyFormatter(eps, currency) : null}
              sublabel="Per share"
            />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <MetricCard
              label="Beta"
              value={beta !== null && beta !== undefined ? beta.toFixed(2) : null}
              sublabel="Unitless"
            />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <MetricCard label="Shares Out" value={compactNumber(sharesOutstanding)} sublabel="Shares" />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <MetricCard label="Float" value={compactNumber(floatShares)} sublabel="Shares" />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <YieldCard
              dividendYield={dividendYield}
              lastClose={lastClose}
              hasPrice={!!lastClose}
              currency={currency}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <DividendCardWide
              currency={currency}
              ttmDividend={dividendTTM}
              lastDividend={lastDividend}
              lastDividendDate={lastDividendDate}
              lastDividendPayDate={lastDividendPayDate}
              exDividendDate={exDividendDate}
              nextDividendDate={nextDividendDate}
              frequency={dividendFrequency}
              lastClose={lastClose}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
