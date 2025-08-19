import HeaderPrice from '@/components/stock/HeaderPrice'
import KpiRow from '@/components/stock/KpiRow'
import PriceChart from '@/components/stock/PriceChart'
import LatestHeadlines from '@/components/stock/LatestHeadlines'

export default function TickerPage({ params }) {
  const ticker = params.ticker?.toUpperCase()
  if (!ticker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Invalid ticker symbol</p>
      </div>
    )
  }
  return (
    <div className="container mx-auto p-4 space-y-8">
      <HeaderPrice ticker={ticker} />
      <KpiRow ticker={ticker} />
      <PriceChart ticker={ticker} />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Latest Headlines</h2>
        <LatestHeadlines ticker={ticker} />
      </section>
    </div>
  )
}
