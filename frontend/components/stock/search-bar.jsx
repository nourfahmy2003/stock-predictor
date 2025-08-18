"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const SearchBar = React.forwardRef(({ className, onTickerSelect, suggestions = [], ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  // Mock ticker suggestions with company names
  const mockTickers = [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "MSFT", name: "Microsoft Corp." },
    { symbol: "TSLA", name: "Tesla Inc." },
    { symbol: "AMZN", name: "Amazon.com Inc." },
    { symbol: "NVDA", name: "NVIDIA Corp." },
    { symbol: "META", name: "Meta Platforms Inc." },
    { symbol: "NFLX", name: "Netflix Inc." },
  ]

  const filteredSuggestions = React.useMemo(() => {
    if (!query) return mockTickers.slice(0, 5)
    return mockTickers
      .filter(
        (ticker) =>
          ticker.symbol.toLowerCase().includes(query.toLowerCase()) ||
          ticker.name.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 5)
  }, [query])

  const handleTickerSelect = (ticker) => {
    setQuery(ticker.symbol)
    setShowSuggestions(false)
    onTickerSelect?.(ticker.symbol)
  }

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <motion.div
        className="relative"
        animate={{
          scale: isFocused ? 1.02 : 1,
          y: isFocused ? -2 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 240,
          damping: 20,
        }}
      >
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground size-5" />
        <Input
          ref={ref}
          className={cn(
            "pl-12 pr-4 h-14 text-lg rounded-xl border-2 transition-all duration-300",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "bg-white/90 dark:bg-card/90 backdrop-blur-sm shadow-inner",
            "placeholder:text-muted-foreground/70",
            isFocused && "shadow-xl shadow-primary/20 border-primary",
            className,
          )}
          placeholder="Search stocks (e.g., AAPL, GOOGL)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true)
            setShowSuggestions(true)
          }}
          onBlur={() => {
            setIsFocused(false)
            setTimeout(() => setShowSuggestions(false), 200)
          }}
          {...props}
        />
      </motion.div>

      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              duration: 0.2,
            }}
          >
            {filteredSuggestions.map((ticker, index) => (
              <motion.button
                key={ticker.symbol}
                className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors flex items-center gap-3 border-b border-border/50 last:border-b-0"
                onClick={() => handleTickerSelect(ticker)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
              >
                <TrendingUp className="size-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-semibold text-foreground">{ticker.symbol}</div>
                  <div className="text-sm text-muted-foreground truncate">{ticker.name}</div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

SearchBar.displayName = "SearchBar"

export { SearchBar }
