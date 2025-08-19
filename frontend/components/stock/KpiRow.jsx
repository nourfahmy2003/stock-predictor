"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { compactNumber, fmtPrice } from "@/lib/format";
import { useOverview } from "@/hooks/use-overview";

export default function KpiRow({ ticker }) {
  const { data, err, loading, reload } = useOverview(ticker);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-muted-foreground text-sm">
        {['Volume', 'Market Cap', 'P/E Ratio', 'Day Range'].map((k) => (
          <div key={k} className="p-2 border rounded-md flex flex-col">
            <span className="text-xs uppercase">{k}</span>
            <span className="mt-1">—</span>
          </div>
        ))}
        <button onClick={() => reload()} className="col-span-2 sm:col-span-4 text-left underline text-xs mt-2">
          Retry
        </button>
      </div>
    );
  }

  const { volume, marketCap, peRatio, dayRange, currency } = data || {};
  const dayLow = dayRange?.low;
  const dayHigh = dayRange?.high;
  const items = [
    { label: 'Volume', value: compactNumber(volume) },
    { label: 'Market Cap', value: compactNumber(marketCap) },
    { label: 'P/E Ratio', value: peRatio != null ? peRatio.toFixed(1) : '—' },
    {
      label: 'Day Range',
      value:
        dayLow != null && dayHigh != null
          ? `${fmtPrice(dayLow, currency)} – ${fmtPrice(dayHigh, currency)}`
          : '—',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="p-2 border rounded-md">
          <div className="text-xs uppercase text-muted-foreground">{item.label}</div>
          <div className="text-sm text-foreground mt-1">{item.value}</div>
        </div>
      ))}
    </div>
  )
}
