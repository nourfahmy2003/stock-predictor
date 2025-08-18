"use client"

import { motion } from "framer-motion"
import { SearchBar } from "@/components/stock/search-bar"
import { useRouter } from "next/navigation"

export default function HomeHero() {
  const router = useRouter()

  const handleTickerSelect = (ticker) => {
    router.push(`/t/${ticker}`)
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/25 dark:bg-black/40 z-10" />

      <div className="relative z-20 text-center max-w-4xl mx-auto">
        <motion.div
          className="space-y-2 mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl md:text-7xl font-bold font-heading leading-tight">
            <span className="text-foreground">AI-Powered</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-500 to-cyan-400 bg-clip-text text-transparent">
              Stock Analysis
            </span>
          </h1>
        </motion.div>

        <motion.p
          className="text-xl md:text-2xl text-muted-foreground/90 mb-12 max-w-2xl mx-auto leading-relaxed font-body"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          Get instant insights on any stock with our AI-powered analysis. Search, predict, and make informed investment
          decisions.
        </motion.p>

        <motion.div
          className="max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <SearchBar onTickerSelect={handleTickerSelect} className="shadow-2xl shadow-primary/10" />
        </motion.div>

        <motion.p
          className="text-sm text-muted-foreground/70 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Try searching for popular stocks like AAPL, GOOGL, or TSLA
        </motion.p>
      </div>
    </section>
  )
}
