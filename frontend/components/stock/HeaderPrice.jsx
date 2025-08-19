"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPrice } from "@/lib/format";
import { useOverview } from "@/hooks/use-overview";

export default function HeaderPrice({ ticker }) {
  const { data, err, loading, reload } = useOverview(ticker);

  if (loading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (err) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="alert">
        <span>Failed to load price data.</span>
        <button onClick={() => reload()} className="underline">
          Retry
        </button>
      </div>
    );
  }

  const { price, change, changePercent, currency, asOf } = data || {};
  const pos = (change ?? 0) > 0
  const neg = (change ?? 0) < 0
  const color = pos ? 'text-green-600' : neg ? 'text-red-600' : 'text-foreground'
  const arrow = pos ? <ArrowUp className="h-4 w-4" /> : neg ? <ArrowDown className="h-4 w-4" /> : null
  const absChange = Math.abs(change ?? 0).toFixed(2)
  const absPct = Math.abs(changePercent ?? 0).toFixed(2)
  const timeStr = asOf
    ? new Date(asOf * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short',
      })
    : ''

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold tracking-tight">{fmtPrice(price, currency)}</span>
        <span className={`flex items-center text-sm ${color}`}>
          {arrow}
          {absChange} ({absPct}%)
        </span>
      </div>
      {timeStr && <div className="text-xs text-muted-foreground">As of {timeStr}</div>}
    </div>
  )
}
