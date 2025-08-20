"use client"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Clock } from "lucide-react"
import { SentimentPulse } from "./sentiment-pulse"

export function NewsList({ ticker, headlines = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Card className="glass border-white/20 dark:border-white/10">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }

  if (!headlines.length) {
    return (
      <Card className="glass border-white/20 dark:border-white/10">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No news available for {ticker}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <AnimatePresence>
      <div className="space-y-4">
        {headlines.map((headline, index) => (
          <NewsItem key={index} headline={headline} index={index} />
        ))}
      </div>
    </AnimatePresence>
  )
}

function NewsItem({ headline, index }) {
  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "bg-success/20 text-success border-success/30"
      case "negative":
        return "bg-danger/20 text-danger border-danger/30"
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30"
    }
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown time"
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <motion.a
      href={headline.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ x: 4 }}
    >
      <Card className="glass border-white/20 dark:border-white/10 hover:bg-white/10 dark:hover:bg-zinc-700/40 transition-all duration-200 group">
        <CardContent className="p-4 text-zinc-900 dark:text-zinc-100">
          <div className="space-y-3">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors line-clamp-2">
              {headline.title}
            </h3>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium">{headline.source}</span>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3" />
                <span>{formatTimeAgo(headline.timestamp)}</span>
              </div>

              {headline.sentiment && (
                <SentimentPulse sentiment={headline.sentiment} className="px-2 py-1">
                  <Badge variant="outline" className={`text-xs ${getSentimentColor(headline.sentiment)}`}>
                    {headline.sentiment}
                  </Badge>
                </SentimentPulse>
              )}

              {headline.url && (
                <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.a>
  )
}

export { NewsItem }
