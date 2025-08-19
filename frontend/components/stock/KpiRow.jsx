"use client"

import useSWR from 'swr'
import { Skeleton } from '@/components/ui/skeleton'
import { compactNumber, fmtPrice } from '@/lib/format'
import { useEffect } from 'react'
import { toast } from 'sonner'

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Network error')
    return r.json()
  })

export default function KpiRow({ ticker }) {
  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/api/overview/${ticker}` : null,
    fetcher,
    { dedupingInterval: 30000, keepPreviousData: true }
  )

  useEffect(() => {
    if (error) toast.error('Failed to load overview')
  }, [error])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-muted-foreground text-sm">
        {['Volume', 'Market Cap', 'P/E Ratio', 'Day Range'].map((k) => (
          <div key={k} className="p-2 border rounded-md flex flex-col">
            <span className="text-xs uppercase">{k}</span>
            <span className="mt-1">—</span>
          </div>
        ))}
        <button onClick={() => mutate()} className="col-span-2 sm:col-span-4 text-left underline text-xs mt-2">
          Retry
        </button>
      </div>
    )
  }

  const { volume, marketCap, peRatio, dayLow, dayHigh, currency } = data || {}
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
