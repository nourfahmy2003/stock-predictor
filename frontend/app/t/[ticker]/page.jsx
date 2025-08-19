"use client"

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { AnimatedTabs } from '@/components/stock/animated-tabs'
import HeaderPrice from '@/components/stock/HeaderPrice'
import KpiRow from '@/components/stock/KpiRow'
import PriceChart from '@/components/stock/PriceChart'
import LatestHeadlines from '@/components/stock/LatestHeadlines'
import PredictionPanel from '@/components/stock/prediction-panel'
import BacktestPanel from '@/components/stock/backtest-panel'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function TickerPage() {
  const params = useParams()
  const ticker = params.ticker?.toString().toUpperCase()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'filings', label: 'Filings' },
    { id: 'news', label: 'News' },
    { id: 'predictions', label: 'Predictions' },
    { id: 'backtest', label: 'Backtest' },
  ]


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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold font-heading">{ticker}</h1>
        <HeaderPrice ticker={ticker} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <AnimatedTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="mb-6"
          />

          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-4">
                    <KpiRow ticker={ticker} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading">Price Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <PriceChart ticker={ticker} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'news' && <LatestHeadlines ticker={ticker} limit={8} />}

            {activeTab === 'predictions' && <PredictionPanel ticker={ticker} />}

            {activeTab === 'backtest' && <BacktestPanel ticker={ticker} />}

            {activeTab === 'filings' && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  SEC filings data would be displayed here
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">Latest Headlines</CardTitle>
            </CardHeader>
            <CardContent>
              <LatestHeadlines ticker={ticker} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

