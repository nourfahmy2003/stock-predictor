"use client"

import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { useOverview } from "@/hooks/use-overview"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function formatCurrency(value, currency = "USD") {
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(num)
  } catch (e) {
    return `$${num.toFixed(2)}`
  }
}

const SESSION_TONES = {
  "PRE-MARKET": "border-sky-400/40 bg-sky-500/15 text-sky-100",
  "OPEN MARKET": "border-emerald-500/40 bg-emerald-500/20 text-emerald-100",
  "POST-MARKET": "border-indigo-400/40 bg-indigo-500/20 text-indigo-100",
  "CLOSED MARKET": "border-white/10 bg-white/5 text-white/70",
}

const SESSION_MAP = {
  PREMARKET: "PRE-MARKET",
  "PRE-MARKET": "PRE-MARKET",
  PRE: "PRE-MARKET",
  OPEN: "OPEN MARKET",
  REGULAR: "OPEN MARKET",
  CONTINUOUS: "OPEN MARKET",
  POSTMARKET: "POST-MARKET",
  "POST-MARKET": "POST-MARKET",
  POST: "POST-MARKET",
  CLOSED: "CLOSED MARKET",
}

function normalizeSession(session) {
  if (!session) return "CLOSED MARKET"
  const key = String(session).toUpperCase()
  return SESSION_MAP[key] || "CLOSED MARKET"
}

function formatEventTime(isoString) {
  if (!isoString) return null
  const dt = new Date(isoString)
  if (Number.isNaN(dt.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(dt)
}

export default function HeaderPrice({ ticker }) {
  const { data, err, loading, reload } = useOverview(ticker)

  if (loading) return <Skeleton className="h-10 w-32" />
  if (err)
    return (
      <div className="text-sm text-red-500">
        Failed to load. <button className="underline" onClick={reload}>Retry</button>
      </div>
    )

  const {
    price,
    changePercent,
    change,
    priceSession,
    regularMarketPrice,
    nextSessionChange,
    marketTimezone,
    currency,
  } = data || {}

  const pct = changePercent != null ? (changePercent * 100).toFixed(2) : null
  const changeAmount = Number(change)
  const changeCurrency = Number.isFinite(changeAmount)
    ? `${changeAmount >= 0 ? "+" : "-"}${formatCurrency(Math.abs(changeAmount), currency)}`
    : null
  const positive = changePercent > 0
  const negative = changePercent < 0
  const tone = positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-zinc-500 dark:text-zinc-400"

  const sessionLabel = normalizeSession(priceSession)
  const priceFormatted = formatCurrency(price, currency)
  const regularFormatted = Number.isFinite(Number(regularMarketPrice))
    ? formatCurrency(regularMarketPrice, currency)
    : null
  const showRegularNote = sessionLabel === "CLOSED MARKET" && regularFormatted

  const badgeTone = SESSION_TONES[sessionLabel] || SESSION_TONES["CLOSED MARKET"]

  const nextEventFormatted = formatEventTime(nextSessionChange)
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"
  let tooltipContent = null
  if (nextEventFormatted) {
    if (sessionLabel === "CLOSED MARKET") {
      tooltipContent = `Reopens ${nextEventFormatted} (your time) • Local TZ: ${userTz}`
    } else if (sessionLabel === "PRE-MARKET") {
      tooltipContent = `Regular session opens ${nextEventFormatted} (your time).`
    } else if (sessionLabel === "OPEN MARKET") {
      tooltipContent = `Market closes ${nextEventFormatted} (your time).`
    } else if (sessionLabel === "POST-MARKET") {
      tooltipContent = `Extended closes ${nextEventFormatted} (your time).`
    }
  }
  if (!tooltipContent && marketTimezone) {
    tooltipContent = `Market timezone: ${marketTimezone}`
  }

  return (
    <div className="flex flex-col gap-2 text-zinc-900 dark:text-zinc-100">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold">{priceFormatted}</span>
        {pct ? (
          <span className={cn("inline-flex items-center gap-1 text-base font-medium", tone)}>
            {positive ? <ArrowUpRight className="h-4 w-4" /> : negative ? <ArrowDownRight className="h-4 w-4" /> : null}
            <span>{pct}%</span>
            {changeCurrency ? <span>({changeCurrency})</span> : null}
          </span>
        ) : (
          <span className="text-base font-medium text-zinc-500 dark:text-zinc-400">—</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <TooltipProvider disableHoverableContent>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  badgeTone
                )}
              >
                {sessionLabel}
              </Badge>
            </TooltipTrigger>
            {tooltipContent ? (
              <TooltipContent>
                <p>{tooltipContent}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
        {showRegularNote ? (
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {`Regular session ${regularFormatted}`}
          </span>
        ) : null}
      </div>
    </div>
  )
}
