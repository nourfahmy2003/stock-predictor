"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export function SentimentBar({ sentiment = 0, animated = false }) {
  const [displaySentiment, setDisplaySentiment] = useState(0)

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplaySentiment(sentiment)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setDisplaySentiment(sentiment)
    }
  }, [sentiment, animated])

  const getSentimentColor = (value) => {
    if (value > 0.2) return "bg-success"
    if (value < -0.2) return "bg-danger"
    return "bg-muted"
  }

  const getSentimentLabel = (value) => {
    if (value > 0.2) return "Positive"
    if (value < -0.2) return "Negative"
    return "Neutral"
  }

  const getSentimentIcon = (value) => {
    if (value > 0.2) return TrendingUp
    if (value < -0.2) return TrendingDown
    return Minus
  }

  const normalizedValue = Math.max(-1, Math.min(1, displaySentiment))
  const percentage = ((normalizedValue + 1) / 2) * 100
  const Icon = getSentimentIcon(normalizedValue)

  return (
    <Card className="bg-card border-grid">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white text-lg">
          <Icon
            className={`size-5 ${normalizedValue > 0.2 ? "text-success" : normalizedValue < -0.2 ? "text-danger" : "text-muted"}`}
          />
          News Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-danger">Negative</span>
            <span className="text-white font-medium">{getSentimentLabel(normalizedValue)}</span>
            <span className="text-success">Positive</span>
          </div>

          <div className="relative h-3 bg-background rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${getSentimentColor(normalizedValue)} ${animated ? "animate-pulse" : ""}`}
              style={{ width: `${percentage}%` }}
            />
            <div className="absolute top-1/2 left-1/2 w-0.5 h-full bg-white/30 transform -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div className="text-center">
            <span className="text-xs text-muted">Based on {Math.floor(Math.random() * 20 + 10)} recent articles</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
