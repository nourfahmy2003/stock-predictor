"use client"

import { motion } from "framer-motion"
import { TrendingUp } from "lucide-react"
import ThemeToggle from "@/components/ui/theme-toggle"
import Link from "next/link"

export default function Navbar() {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold font-heading text-foreground group-hover:text-primary transition-colors duration-200">
                MarketPulse
              </h1>
              <p className="text-xs text-muted-foreground font-body">AI Stock Analysis</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 font-body"
              >
                About
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 font-body"
              >
                Pricing
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
