"use client"

import useSWR from 'swr'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtPrice } from '@/lib/format'
import { useEffect } from 'react'
import { toast } from 'sonner'

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Network error')
    return r.json()
  })

export default function HeaderPrice({ ticker }) {
  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/api/overview/${ticker}` : null,
    fetcher,
    { dedupingInterval: 30000, keepPreviousData: true }
  )

  useEffect(() => {
    if (error) toast.error('Failed to load price')
  }, [error])

  if (isLoading) {
    return <Skeleton className="h-12 w-full" />
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="alert">
        <span>Failed to load price data.</span>
        <button onClick={() => mutate()} className="underline">
          Retry
        </button>
      </div>
    )
  }

  const { price, change, changePercent, currency, regularMarketTime } = data || {}
  const pos = (change ?? 0) > 0
  const neg = (change ?? 0) < 0
  const color = pos ? 'text-green-600' : neg ? 'text-red-600' : 'text-foreground'
  const arrow = pos ? <ArrowUp className="h-4 w-4" /> : neg ? <ArrowDown className="h-4 w-4" /> : null
  const absChange = Math.abs(change ?? 0).toFixed(2)
  const absPct = Math.abs(changePercent ?? 0).toFixed(2)
  const timeStr = regularMarketTime
    ? new Date(regularMarketTime * 1000).toLocaleTimeString('en-US', {
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
      {timeStr && (
        <div className="text-xs text-muted-foreground">As of {timeStr}</div>
      )}
    </div>
  )
}
