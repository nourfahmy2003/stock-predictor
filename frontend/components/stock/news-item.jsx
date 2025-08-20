"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function NewsItem({
  headline,
  source,
  publishedAt,
  sentiment = "neutral",
  url,
  className,
  index = 0,
  ...props
}) {
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return "bg-success/20 text-success border-success/30"
      case "negative":
        return "bg-danger/20 text-danger border-danger/30"
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30"
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ x: 4 }}
    >
      <Card
        className={cn(
          "glass border-white/20 dark:border-white/10 hover:bg-white/10 dark:hover:bg-zinc-700/40",
          "transition-all duration-200 group",
          className,
        )}
        {...props}
      >
        <CardContent className="p-4 text-zinc-900 dark:text-zinc-100">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium leading-snug text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors line-clamp-2">
                {headline}
              </h3>
              {url && (
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">{source}</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3" />
                  <span>{formatTimeAgo(publishedAt)}</span>
                </div>
              </div>

              <Badge variant="outline" className={cn("text-xs capitalize", getSentimentColor(sentiment))}>
                {sentiment}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.a>
  )
}
