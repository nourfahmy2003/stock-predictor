"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function SentimentPulse({ sentiment = "neutral", className, children, ...props }) {
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return "bg-success/20 border-success/30"
      case "negative":
        return "bg-danger/20 border-danger/30"
      default:
        return "bg-muted/20 border-muted/30"
    }
  }

  return (
    <motion.div
      className={cn(
        "relative rounded-full border-2 transition-all duration-300",
        getSentimentColor(sentiment),
        className,
      )}
      animate={{
        scale: [1, 1.05, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
      {...props}
    >
      {children}
      <motion.div
        className={cn("absolute inset-0 rounded-full", getSentimentColor(sentiment))}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  )
}
