"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnimatedTabs } from "@/components/stock/animated-tabs"
import { NewsList } from "@/components/stock/news-list"
import { StatCard } from "@/components/stock/stat-card"
import { PredictionPanel } from "@/components/stock/prediction-panel"
import { BacktestPanel } from "@/components/stock/backtest-panel"
import { ArrowUp, ArrowDown, Newspaper, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function TickerPage() {
  const params = useParams()
  const ticker = params.ticker?.toString().toUpperCase()

  const [activeTab, setActiveTab] = useState("overview")
  const [stockData, setStockData] = useState(null)
  const [newsData, setNewsData] = useState([])
  const [isLoadingNews, setIsLoadingNews] = useState(true)
  const [isLoadingStock, setIsLoadingStock] = useState(true)

  // Enhanced UX: Auto-load news and show toast
  useEffect(() => {
    if (ticker) {
      // Load stock data
      loadStockData(ticker)
      // Enhanced UX: Immediately load news
      loadNewsData(ticker)
    }
  }, [ticker])

  const loadStockData = async (symbol) => {
    setIsLoadingStock(true)
    // Simulate API call
    setTimeout(() => {
      setStockData({
        name: getCompanyName(symbol),
        price: 185.42,
        change: 2.34,
        changePercent: 1.28,
        volume: "45.2M",
        marketCap: "2.85T",
        peRatio: 28.5,
        dayRange: "182.10 - 186.50",
      })
      setIsLoadingStock(false)
    }, 1000)
  }

  const loadNewsData = async (symbol) => {
    setIsLoadingNews(true)
    // Simulate API call
    setTimeout(() => {
      const mockNews = generateMockNews(symbol)
      setNewsData(mockNews)
      setIsLoadingNews(false)

      // Enhanced UX: Show toast notification
      toast.success("Latest headlines loaded", {
        description: `Found ${mockNews.length} recent articles for ${symbol}`,
        action: {
          label: "View News",
          onClick: () => setActiveTab("news"),
        },
      })
    }, 1500)
  }

  const getCompanyName = (symbol) => {
    const companies = {
      AAPL: "Apple Inc.",
      GOOGL: "Alphabet Inc.",
      MSFT: "Microsoft Corporation",
      TSLA: "Tesla, Inc.",
      AMZN: "Amazon.com Inc.",
      NVDA: "NVIDIA Corporation",
      META: "Meta Platforms Inc.",
      NFLX: "Netflix Inc.",
    }
    return companies[symbol] || `${symbol} Corporation`
  }

  const generateMockNews = (symbol) => [
    {
      title: `${symbol} Reports Strong Quarterly Earnings Beat`,
      source: "Financial Times",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      sentiment: "positive",
      url: "#",
    },
    {
      title: `Analysts Upgrade ${symbol} Price Target`,
      source: "Reuters",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      sentiment: "positive",
      url: "#",
    },
    {
      title: `${symbol} Announces New Product Launch`,
      source: "Bloomberg",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      sentiment: "neutral",
      url: "#",
    },
    {
      title: `Market Volatility Affects ${symbol} Trading`,
      source: "CNBC",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      sentiment: "negative",
      url: "#",
    },
    {
      title: `${symbol} CEO Discusses Future Strategy`,
      source: "Wall Street Journal",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      sentiment: "neutral",
      url: "#",
    },
    {
      title: `Institutional Investors Increase ${symbol} Holdings`,
      source: "MarketWatch",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      sentiment: "positive",
      url: "#",
    },
    {
      title: `${symbol} Stock Analysis: Technical Indicators`,
      source: "Seeking Alpha",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      sentiment: "neutral",
      url: "#",
    },
    {
      title: `Regulatory Update Impacts ${symbol} Operations`,
      source: "Financial News",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      sentiment: "negative",
      url: "#",
    },
  ]

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "filings", label: "Filings" },
    { id: "news", label: "News" },
    { id: "predictions", label: "Predictions" },
    { id: "backtest", label: "Backtest" },
  ]

  if (!ticker) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Invalid ticker symbol</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="size-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="text-xl font-bold font-heading">StockPredict</div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold font-heading">{isLoadingStock ? ticker : stockData?.name}</h1>
              <p className="text-muted-foreground font-mono text-lg">{ticker}</p>
            </div>

            {stockData && (
              <motion.div
                className="text-right"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="text-4xl font-bold font-mono">${stockData.price}</div>
                <div
                  className={`flex items-center gap-1 justify-end ${stockData.change >= 0 ? "text-success" : "text-danger"}`}
                >
                  {stockData.change >= 0 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                  <span className="font-mono">
                    ${Math.abs(stockData.change)} ({stockData.changePercent}%)
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Enhanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <AnimatedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="mb-6" />

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Key Stats */}
                  {stockData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard title="Volume" value={stockData.volume} tooltip="Number of shares traded today" />
                      <StatCard
                        title="Market Cap"
                        value={stockData.marketCap}
                        tooltip="Total market value of all shares"
                      />
                      <StatCard title="P/E Ratio" value={stockData.peRatio} tooltip="Price-to-earnings ratio" />
                      <StatCard title="Day Range" value={stockData.dayRange} tooltip="Today's trading range" />
                    </div>
                  )}

                  {/* Chart Placeholder */}
                  <Card className="glass border-white/20 dark:border-white/10">
                    <CardHeader>
                      <CardTitle className="font-heading">Price Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-muted/10 rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">Interactive price chart would go here</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "news" && <NewsList ticker={ticker} headlines={newsData} isLoading={isLoadingNews} />}

              {activeTab === "predictions" && <PredictionPanel ticker={ticker} />}

              {activeTab === "backtest" && <BacktestPanel ticker={ticker} />}

              {activeTab === "filings" && (
                <Card className="glass border-white/20 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="font-heading">SEC Filings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">SEC filings data would be displayed here</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>

          {/* News Sidebar Widget */}
          <div className="lg:col-span-1">
            <Card className="glass border-white/20 dark:border-white/10 sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-heading">
                  <Newspaper className="size-5 text-primary" />
                  Latest Headlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingNews ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 bg-muted/20 rounded animate-pulse" />
                        <div className="h-2 bg-muted/10 rounded animate-pulse w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {newsData.slice(0, 4).map((headline, index) => (
                      <div key={index} className="space-y-1 pb-3 border-b border-grid last:border-b-0">
                        <h4 className="text-sm font-medium text-white line-clamp-2 hover:text-primary cursor-pointer transition-colors">
                          {headline.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{headline.source}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              headline.sentiment === "positive"
                                ? "bg-success/20 text-success border-success/30"
                                : headline.sentiment === "negative"
                                  ? "bg-danger/20 text-danger border-danger/30"
                                  : "bg-muted/20 text-muted border-muted/30"
                            }`}
                          >
                            {headline.sentiment}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-primary hover:text-primary/80"
                      onClick={() => setActiveTab("news")}
                    >
                      View All News
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
