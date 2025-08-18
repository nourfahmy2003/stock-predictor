"use client"

import { useState, useEffect } from "react"
import { Clock, ExternalLink, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SentimentBar } from "@/components/stock/sentiment-bar"

export function NewsTab({ ticker }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [overallSentiment, setOverallSentiment] = useState(0)

  useEffect(() => {
    // Mock API call - in real app, this would fetch from /api/news/{ticker}
    const fetchNews = async () => {
      setLoading(true)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockNews = [
        {
          id: "1",
          title: `${ticker} Reports Strong Q4 Earnings, Beats Analyst Expectations`,
          summary:
            "The company delivered impressive quarterly results with revenue growth of 15% year-over-year, driven by strong demand across all segments.",
          source: "Financial Times",
          publishedAt: "2024-01-20T10:30:00Z",
          url: "#",
          sentiment: 0.8,
        },
        {
          id: "2",
          title: `Analysts Upgrade ${ticker} Price Target Following Innovation Announcement`,
          summary:
            "Multiple investment firms have raised their price targets after the company unveiled its next-generation product lineup.",
          source: "Reuters",
          publishedAt: "2024-01-19T14:15:00Z",
          url: "#",
          sentiment: 0.6,
        },
        {
          id: "3",
          title: `${ticker} Faces Regulatory Scrutiny Over Market Practices`,
          summary:
            "Federal regulators are examining the company's business practices in key markets, potentially impacting future operations.",
          source: "Wall Street Journal",
          publishedAt: "2024-01-18T09:45:00Z",
          url: "#",
          sentiment: -0.4,
        },
        {
          id: "4",
          title: `${ticker} Announces Strategic Partnership with Tech Giant`,
          summary:
            "The collaboration is expected to accelerate product development and expand market reach in emerging technologies.",
          source: "Bloomberg",
          publishedAt: "2024-01-17T16:20:00Z",
          url: "#",
          sentiment: 0.5,
        },
      ]

      setNews(mockNews)

      // Calculate overall sentiment
      const avgSentiment = mockNews.reduce((sum, item) => sum + item.sentiment, 0) / mockNews.length
      setOverallSentiment(avgSentiment)
      setLoading(false)
    }

    fetchNews()
  }, [ticker])

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </Card>

        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sentiment Overview */}
      <Card className="p-6">
        <SentimentBar sentiment={overallSentiment} animated={true} />
      </Card>

      {/* News Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-poppins font-semibold text-white">Latest News for {ticker}</h3>
          <p className="text-sm text-muted">{news.length} recent articles</p>
        </div>

        <div className="space-y-4">
          {news.map((article) => (
            <Card key={article.id} className="bg-card border-grid hover:border-primary/30 transition-all duration-300">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-white leading-tight hover:text-primary transition-colors cursor-pointer">
                      {article.title}
                    </h4>

                    <p className="text-muted text-sm leading-relaxed">{article.summary}</p>

                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span className="font-medium">{article.source}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTimeAgo(article.publishedAt)}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          article.sentiment > 0 ? "text-success" : article.sentiment < 0 ? "text-danger" : "text-muted"
                        }`}
                      >
                        <TrendingUp className="size-3" />
                        {article.sentiment > 0 ? "Positive" : article.sentiment < 0 ? "Negative" : "Neutral"}
                      </span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="shrink-0 bg-transparent">
                    Read More
                    <ExternalLink className="size-3 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
